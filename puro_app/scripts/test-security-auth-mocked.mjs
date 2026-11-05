import assert from "node:assert/strict"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const origin = "https://security-test.example"
const jwtSecret = "isolated-security-test-secret"
process.env.APP_ORIGIN = origin
process.env.JWT_SECRET = jwtSecret
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/never-used"

mongoose.connect = async () => mongoose
globalThis.mongoose = { conn: null, promise: null }

const [{ NextRequest }, { default: User }, { default: Supplier }, loginRoute, logoutRoute, supplierRoute, supplierIdRoute] =
  await Promise.all([
    import("next/server"),
    import("@/lib/models/User"),
    import("@/lib/models/Supplier"),
    import("@/app/api/auth/login/route"),
    import("@/app/api/auth/logout/route"),
    import("@/app/api/suppliers/route"),
    import("@/app/api/suppliers/[id]/route"),
  ])

function request(pathname, method, { body, token, requestOrigin = origin } = {}) {
  const headers = new Headers({ Origin: requestOrigin })
  if (body !== undefined) headers.set("Content-Type", "application/json")
  if (token !== undefined) headers.set("Cookie", `auth-token=${token}`)
  return new NextRequest(`${origin}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const password = "valid-test-password"
const passwordHash = await bcrypt.hash(password, 4)
const userId = new mongoose.Types.ObjectId().toString()
const existingUser = {
  _id: { toString: () => userId },
  username: "test-user",
  password: passwordHash,
}

User.findOne = async ({ username }) => username === existingUser.username ? existingUser : null
User.exists = async ({ _id }) => String(_id) === userId ? { _id: userId } : null

let response = await loginRoute.POST(request("/api/auth/login", "POST", {
  body: { username: existingUser.username, password },
}))
assert.equal(response.status, 200, "valid mocked credentials log in")

const loginCookie = response.headers.get("set-cookie") || ""
const token = /auth-token=([^;]+)/.exec(loginCookie)?.[1]
assert.ok(token, "login generates an auth-token cookie")
const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] })
assert.equal(payload.userId, userId, "generated JWT contains the authenticated userId")

let created = 0
let updated = 0
let deleted = 0
Supplier.create = async (data) => {
  created += 1
  return { _id: "supplier-id", ...data }
}
Supplier.findByIdAndUpdate = async (_id, data) => {
  updated += 1
  return { _id, ...data }
}
Supplier.findByIdAndDelete = async (_id) => {
  deleted += 1
  return { _id }
}

response = await supplierRoute.POST(request("/api/suppliers", "POST", {
  token,
  body: { nombre: "Proveedor mock", nombreSistema: "MOCK", debeFacturar: false },
}))
assert.equal(response.status, 201, "authenticated POST is authorized")

response = await supplierIdRoute.PUT(request("/api/suppliers/supplier-id", "PUT", {
  token,
  body: { estado: "Inactivo" },
}), { params: { id: "supplier-id" } })
assert.equal(response.status, 200, "authenticated PUT is authorized")

response = await supplierIdRoute.DELETE(request("/api/suppliers/supplier-id", "DELETE", { token }), {
  params: { id: "supplier-id" },
})
assert.equal(response.status, 200, "authenticated DELETE is authorized")
assert.deepEqual({ created, updated, deleted }, { created: 1, updated: 1, deleted: 1 })

User.exists = async () => null
response = await supplierRoute.POST(request("/api/suppliers", "POST", {
  token,
  body: { nombre: "No permitido" },
}))
assert.equal(response.status, 401, "JWT for a nonexistent user is rejected")
assert.equal(created, 1, "rejected user cannot execute the commercial operation")

User.exists = async () => ({ _id: userId })
response = await supplierRoute.POST(request("/api/suppliers", "POST", {
  token,
  requestOrigin: "https://attacker.invalid",
  body: { nombre: "Origen hostil" },
}))
assert.equal(response.status, 403, "external origin is rejected")
assert.equal(created, 1, "rejected origin cannot execute the commercial operation")

response = await logoutRoute.POST(request("/api/auth/logout", "POST", { token }))
assert.equal(response.status, 200, "authenticated session can log out")
assert.match(response.headers.get("set-cookie") || "", /auth-token=;/)

response = await supplierRoute.POST(request("/api/suppliers", "POST", {
  token: "",
  body: { nombre: "Después de logout" },
}))
assert.equal(response.status, 401, "cleared session is rejected after logout")

console.log("Mocked authenticated flow checks passed")
