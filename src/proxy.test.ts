import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"

function makeRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = new URL(pathname, "http://localhost")
  const req = new NextRequest(url)
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value)
  }
  return req
}

const SESSION = "better-auth.session_token"
const ROLE = "user-role"
const SESSION_VAL = "tok123"

describe("proxy", () => {
  describe("public routes", () => {
    it("allows /login without session", () => {
      const res = proxy(makeRequest("/login"))
      expect(res.status).toBe(200)
    })

    it("allows /api/auth/signin without session", () => {
      const res = proxy(makeRequest("/api/auth/signin"))
      expect(res.status).toBe(200)
    })
  })

  describe("unauthenticated access", () => {
    it("redirects to /login with returnTo when no session cookie", () => {
      const res = proxy(makeRequest("/dashboard"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
      expect(res.headers.get("location")).toContain("returnTo=%2Fdashboard")
    })

    it("preserves deep-link path in returnTo — /approvals/abc123", () => {
      const res = proxy(makeRequest("/approvals/abc123"))
      expect(res.status).toBe(307)
      const location = res.headers.get("location") ?? ""
      expect(location).toContain("/login")
      expect(location).toContain("returnTo=%2Fapprovals%2Fabc123")
    })

    it("redirects for protected API routes", () => {
      const res = proxy(makeRequest("/approvals"))
      expect(res.status).toBe(307)
    })
  })

  describe("authenticated — TRAINER role enforcement", () => {
    const trainerCookies = { [SESSION]: SESSION_VAL, [ROLE]: "TRAINER" }

    it("allows /dashboard", () => {
      const res = proxy(makeRequest("/dashboard", trainerCookies))
      expect(res.status).toBe(200)
    })

    it("returns 403 on /approvals", () => {
      const res = proxy(makeRequest("/approvals", trainerCookies))
      expect(res.status).toBe(403)
    })

    it("returns 403 on /approvals/abc", () => {
      const res = proxy(makeRequest("/approvals/abc", trainerCookies))
      expect(res.status).toBe(403)
    })

    it("returns 403 on /trainers", () => {
      const res = proxy(makeRequest("/trainers", trainerCookies))
      expect(res.status).toBe(403)
    })

    it("returns 403 on /users", () => {
      const res = proxy(makeRequest("/users", trainerCookies))
      expect(res.status).toBe(403)
    })

    it("allows /requests (trainer route)", () => {
      const res = proxy(makeRequest("/requests", trainerCookies))
      expect(res.status).toBe(200)
    })
  })

  describe("authenticated — SUPERVISOR role enforcement", () => {
    const supervisorCookies = { [SESSION]: SESSION_VAL, [ROLE]: "SUPERVISOR" }

    it("allows /dashboard", () => {
      const res = proxy(makeRequest("/dashboard", supervisorCookies))
      expect(res.status).toBe(200)
    })

    it("allows /approvals", () => {
      const res = proxy(makeRequest("/approvals", supervisorCookies))
      expect(res.status).toBe(200)
    })

    it("allows /trainers", () => {
      const res = proxy(makeRequest("/trainers", supervisorCookies))
      expect(res.status).toBe(200)
    })

    it("returns 403 on /requests", () => {
      const res = proxy(makeRequest("/requests", supervisorCookies))
      expect(res.status).toBe(403)
    })

    it("returns 403 on /requests/new", () => {
      const res = proxy(makeRequest("/requests/new", supervisorCookies))
      expect(res.status).toBe(403)
    })
  })

  describe("authenticated — no role cookie", () => {
    it("passes through (role check skipped when cookie absent)", () => {
      const res = proxy(makeRequest("/approvals", { [SESSION]: SESSION_VAL }))
      expect(res.status).toBe(200)
    })
  })
})
