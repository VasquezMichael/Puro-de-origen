import mongoose from "mongoose"

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  const mongodbUri = process.env.MONGODB_URI

  if (!mongodbUri) {
    throw new Error("MONGODB_URI environment variable is required")
  }

  if (cached.conn) {
    console.log("🔄 Using existing MongoDB connection")
    return cached.conn
  }

  if (!cached.promise) {
    console.log("🔌 Creating new MongoDB connection...")
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(mongodbUri, opts).then((mongoose) => {
      console.log("✅ MongoDB connected successfully")
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
    console.log("✅ MongoDB connection established")
  } catch (e) {
    console.error("💥 MongoDB connection failed:", e)
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect
