import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "2h"; // reduced from 8h — mitigasi isActive check tanpa query DB setiap request
const COOKIE_NAME = "pos_session";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET tidak ditemukan di environment variables");
}

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: string;
  menuPermissions: string[];
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 jam (sinkron dengan JWT_EXPIRES_IN)
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  // Backward compatibility: ensure menuPermissions is always an array
  return { ...payload, menuPermissions: payload.menuPermissions ?? [] };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
