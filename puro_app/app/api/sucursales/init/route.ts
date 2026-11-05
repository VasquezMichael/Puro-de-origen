import { type NextRequest } from "next/server"
import { authenticateRequest, forbiddenResponse } from "@/lib/request-security"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { checkUser: false })
  if (!auth.authenticated) return auth.response
  return forbiddenResponse("Sucursal initialization is disabled")
}
