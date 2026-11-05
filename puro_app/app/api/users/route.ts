import { type NextRequest } from "next/server"
import { authenticateRequest, forbiddenResponse } from "@/lib/request-security"

async function denyWithoutAdministrativePolicy(request: NextRequest) {
  const auth = await authenticateRequest(request, { checkUser: false })
  if (!auth.authenticated) return auth.response
  return forbiddenResponse("User administration is disabled")
}

export async function GET(request: NextRequest) {
  return denyWithoutAdministrativePolicy(request)
}

export async function POST(request: NextRequest) {
  return denyWithoutAdministrativePolicy(request)
}
