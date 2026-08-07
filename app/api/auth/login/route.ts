import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { createSession } from "@/lib/session";

// ── Simple in-memory rate limiter ──────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_WINDOW = 5;

const rateLimitMap = new Map<
  string,
  { count: number; resetAt: number }
>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // Clean up expired entries periodically
  if (entry && now > entry.resetAt) {
    rateLimitMap.delete(key);
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);
// ────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Rate limit: key = ip + username (lowercased)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rateLimitKey = `${ip}:${username.toLowerCase().trim()}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit." },
        { status: 429 }
      );
    }

    await connectDB();

    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json(
        { message: "Username atau password salah" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Akun Anda telah dinonaktifkan. Hubungi administrator." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Username atau password salah" },
        { status: 401 }
      );
    }

    const menuPermissions: string[] = user.menuPermissions ?? [];

    await createSession({
      userId: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      menuPermissions,
    });

    return NextResponse.json({
      message: "Login berhasil",
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: user.role,
        menuPermissions,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    });
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
