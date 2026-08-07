import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI tidak ditemukan di environment variables");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

async function connectDB(): Promise<typeof mongoose> {
  // Jika sudah terkoneksi dan status sehat, langsung return
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Reset cache jika koneksi sebelumnya mati atau belum ada
  if (mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: true, // biarkan mongoose buffer query saat reconnect
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Jangan cache rejected promise — reset agar retry berikutnya segar
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
