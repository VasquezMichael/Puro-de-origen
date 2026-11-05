import assert from "node:assert/strict"
import mongoose from "mongoose"

delete process.env.MONGODB_URI
globalThis.mongoose = { conn: null, promise: null }

let connectCalls = 0
mongoose.connect = async () => {
  connectCalls += 1
  return mongoose
}

const { default: dbConnect } = await import("../lib/mongodb.ts")

assert.equal(typeof dbConnect, "function", "mongodb module imports without MONGODB_URI")
await assert.rejects(
  dbConnect(),
  /MONGODB_URI environment variable is required/,
  "dbConnect fails explicitly when MONGODB_URI is missing",
)
assert.equal(connectCalls, 0, "mongoose.connect is not called without MONGODB_URI")

process.env.MONGODB_URI = "mongodb://127.0.0.1:1/isolated-test"
await dbConnect()
assert.equal(connectCalls, 1, "dbConnect uses MONGODB_URI only when invoked")

console.log("MongoDB configuration checks passed")
