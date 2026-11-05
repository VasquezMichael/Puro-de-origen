const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const path = require("node:path")
const jwt = require("jsonwebtoken")

const port = 3217
const baseUrl = `http://127.0.0.1:${port}`
const jwtSecret = "local-security-test-secret-that-is-not-used-outside-tests"
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next")

function authCookie(token) {
  return { Cookie: `auth-token=${token}` }
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next.js exited with code ${server.exitCode}`)
    try {
      const response = await fetch(`${baseUrl}/login`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error("Timed out waiting for the local Next.js server")
}

async function run() {
  const server = spawn(process.execPath, [nextBin, "dev", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      JWT_SECRET: jwtSecret,
      MONGODB_URI: "mongodb://127.0.0.1:1/security-test",
      URL: baseUrl,
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  let output = ""
  server.stdout.on("data", (chunk) => { output += chunk.toString() })
  server.stderr.on("data", (chunk) => { output += chunk.toString() })

  try {
    await waitForServer(server)

    const validToken = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "5m",
    })
    const expiredToken = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: -1,
    })
    const invalidPayloadToken = jwt.sign({ subject: "507f1f77bcf86cd799439011" }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "5m",
    })
    const disallowedAlgorithmToken = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, jwtSecret, {
      algorithm: "HS384",
      expiresIn: "5m",
    })
    const tamperedToken = `${validToken.slice(0, -1)}${validToken.endsWith("a") ? "b" : "a"}`

    const privateRoutes = [
      ["GET", "/api/suppliers"],
      ["POST", "/api/suppliers"],
      ["PUT", "/api/suppliers/test-id"],
      ["DELETE", "/api/suppliers/test-id"],
      ["GET", "/api/sucursales"],
      ["POST", "/api/sucursales"],
      ["PUT", "/api/sucursales/test-id"],
      ["DELETE", "/api/sucursales/test-id"],
      ["POST", "/api/sucursales/init"],
      ["GET", "/api/payments"],
      ["POST", "/api/payments"],
      ["PUT", "/api/payments/test-id"],
      ["DELETE", "/api/payments/test-id"],
      ["POST", "/api/payments/test-id/pay"],
      ["POST", "/api/payments/test-id/cancel"],
      ["POST", "/api/payments/test-id/no-reclama"],
      ["POST", "/api/payments/test-id/credit-note"],
      ["GET", "/api/users"],
      ["POST", "/api/users"],
    ]

    for (const [method, pathname] of privateRoutes) {
      const response = await fetch(`${baseUrl}${pathname}`, { method })
      assert.equal(response.status, 401, `${method} ${pathname} without cookie`)
    }

    let response

    response = await fetch(`${baseUrl}/api/suppliers`, { headers: authCookie("arbitrary") })
    assert.equal(response.status, 401, "private API with arbitrary cookie")

    response = await fetch(`${baseUrl}/api/suppliers`, { headers: authCookie(tamperedToken) })
    assert.equal(response.status, 401, "private API with tampered JWT")

    response = await fetch(`${baseUrl}/api/suppliers`, { headers: authCookie(expiredToken) })
    assert.equal(response.status, 401, "private API with expired JWT")

    response = await fetch(`${baseUrl}/api/suppliers`, { headers: authCookie(invalidPayloadToken) })
    assert.equal(response.status, 401, "private API with invalid JWT payload")

    response = await fetch(`${baseUrl}/api/suppliers`, { headers: authCookie(disallowedAlgorithmToken) })
    assert.equal(response.status, 401, "private API with disallowed JWT algorithm")

    response = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" })
    assert.equal(response.status, 307, "dashboard without session redirects")
    assert.equal(new URL(response.headers.get("location")).pathname, "/login")

    response = await fetch(`${baseUrl}/dashboard`, {
      redirect: "manual",
      headers: authCookie("arbitrary"),
    })
    assert.equal(response.status, 307, "dashboard with invalid cookie redirects")

    response = await fetch(`${baseUrl}/dashboard`, { headers: authCookie(validToken) })
    assert.equal(response.status, 200, "dashboard with valid JWT is allowed")

    response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { Origin: baseUrl },
    })
    assert.equal(response.status, 403, "public registration is disabled")

    response = await fetch(`${baseUrl}/api/users`)
    assert.equal(response.status, 401, "admin endpoint without session")

    response = await fetch(`${baseUrl}/api/users`, { headers: authCookie(validToken) })
    assert.equal(response.status, 403, "admin endpoint remains closed to authenticated users")

    response = await fetch(`${baseUrl}/api/sucursales/init`, {
      method: "POST",
      headers: { ...authCookie(validToken), Origin: baseUrl },
    })
    assert.equal(response.status, 403, "initialization endpoint remains closed")

    response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Origin: baseUrl,
        "X-Forwarded-Host": "attacker.invalid",
        "X-Forwarded-Proto": "https",
      },
    })
    assert.equal(response.status, 200, "trusted Netlify origin is not replaced by forwarded headers")
    const logoutCookie = response.headers.get("set-cookie") || ""
    assert.match(logoutCookie, /auth-token=;/)
    assert.match(logoutCookie, /Max-Age=0/i)
    assert.match(logoutCookie, /Path=\//i)
    assert.match(logoutCookie, /HttpOnly/i)
    assert.match(logoutCookie, /SameSite=strict/i)

    response = await fetch(`${baseUrl}/api/suppliers`, {
      headers: { Cookie: "auth-token=" },
    })
    assert.equal(response.status, 401, "cleared logout cookie is rejected")

    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://attacker.invalid",
        "X-Forwarded-Host": "attacker.invalid",
        "X-Forwarded-Proto": "https",
      },
      body: JSON.stringify({ username: "test", password: "test" }),
    })
    assert.equal(response.status, 403, "cross-origin login request is rejected before database access")

    console.log("Security authentication integration checks passed")
  } finally {
    server.kill()
    await new Promise((resolve) => {
      if (server.exitCode !== null) return resolve()
      server.once("exit", resolve)
      setTimeout(resolve, 3000)
    })
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
