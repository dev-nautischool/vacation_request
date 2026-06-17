import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Better Auth session cookie name (set by the better-auth library)
const SESSION_COOKIE = "better-auth.session_token"
const ROLE_COOKIE = "user-role"

// Routes accessible without authentication
const PUBLIC_PREFIXES = ["/login", "/api/auth/"]

// Routes restricted by role
const TRAINER_FORBIDDEN = ["/approvals", "/trainers", "/users"]
const SUPERVISOR_FORBIDDEN = ["/requests"]

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // Allow public routes through without any checks
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)

  // No session → redirect to login with returnTo
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("returnTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Optimistic RBAC check using the role cookie set at login
  const role = request.cookies.get(ROLE_COOKIE)?.value

  // Role cookie absent despite valid session — force re-login to refresh it
  if (!role) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("returnTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (role === "TRAINER" && TRAINER_FORBIDDEN.some((p) => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 403 })
  }

  if (role === "SUPERVISOR" && SUPERVISOR_FORBIDDEN.some((p) => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
