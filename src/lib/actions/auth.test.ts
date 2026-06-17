import { describe, it, expect, vi, beforeEach } from "vitest"
import { ERRORS } from "@/lib/errors"
import type { ActionResult } from "@/types"

const { mockCookieSet, mockCookieDelete } = vi.hoisted(() => ({
  mockCookieSet: vi.fn(),
  mockCookieDelete: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ set: mockCookieSet, delete: mockCookieDelete }),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

import { login } from "./auth"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const mockPrismaUser = prisma.user as unknown as { findFirst: ReturnType<typeof vi.fn> }
const mockSignIn = auth.api.signInEmail as unknown as ReturnType<typeof vi.fn>
const mockSignOut = auth.api.signOut as unknown as ReturnType<typeof vi.fn>

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

describe("login action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieSet.mockReset()
    mockCookieDelete.mockReset()
  })

  it("returns UNAUTHORIZED when user does not exist", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"))

    const result = await login(null, makeFormData({ email: "x@x.com", password: "pw" }))

    expect(result).toEqual<ActionResult<{ redirectTo: string }>>({
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    })
    expect(mockPrismaUser.findFirst).not.toHaveBeenCalled()
  })

  it("returns UNAUTHORIZED when user not found in DB after signIn", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue(null)
    mockSignOut.mockResolvedValue(undefined)

    const result = await login(null, makeFormData({ email: "ghost@x.com", password: "pw" }))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  it("returns UNAUTHORIZED for deleted user (deletedAt set)", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: new Date(), role: "TRAINER" })
    mockSignOut.mockResolvedValue(undefined)

    const result = await login(
      null,
      makeFormData({ email: "deleted@x.com", password: "pw" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    }
    expect(mockSignOut).toHaveBeenCalled()
  })

  it("returns UNAUTHORIZED when better-auth throws", async () => {
    mockPrismaUser.findFirst.mockResolvedValue({ id: "user-1" })
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"))

    const result = await login(
      null,
      makeFormData({ email: "admin@x.com", password: "wrong" }),
    )

    expect(result).toEqual<ActionResult<{ redirectTo: string }>>({
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    })
  })

  it("returns success with /dashboard redirect on valid credentials", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: null, role: "TRAINER" })

    const result = await login(
      null,
      makeFormData({ email: "admin@x.com", password: "correct" }),
    )

    expect(result).toEqual<ActionResult<{ redirectTo: string }>>({
      success: true,
      data: { redirectTo: "/dashboard" },
    })
  })

  it("uses returnTo from form if valid internal path", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: null, role: "TRAINER" })

    const result = await login(
      null,
      makeFormData({ email: "a@x.com", password: "p", returnTo: "/approvals/123" }),
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.redirectTo).toBe("/approvals/123")
    }
  })

  it("rejects external returnTo (open-redirect prevention)", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: null, role: "TRAINER" })

    const result = await login(
      null,
      makeFormData({ email: "a@x.com", password: "p", returnTo: "http://evil.com" }),
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.redirectTo).toBe("/dashboard")
    }
  })

  it("sets user-role cookie with TRAINER role on successful login", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: null, role: "TRAINER" })

    await login(null, makeFormData({ email: "a@x.com", password: "p" }))

    expect(mockCookieSet).toHaveBeenCalledWith(
      "user-role",
      "TRAINER",
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it("sets user-role cookie with SUPERVISOR role on successful login", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "s1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: null, role: "SUPERVISOR" })

    await login(null, makeFormData({ email: "sup@x.com", password: "p" }))

    expect(mockCookieSet).toHaveBeenCalledWith(
      "user-role",
      "SUPERVISOR",
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it("does not set role cookie when login fails (signInEmail throws)", async () => {
    mockSignIn.mockRejectedValue(new Error("bad creds"))

    await login(null, makeFormData({ email: "x@x.com", password: "wrong" }))

    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  it("does not set role cookie when user is deleted", async () => {
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaUser.findFirst.mockResolvedValue({ deletedAt: new Date(), role: "TRAINER" })
    mockSignOut.mockResolvedValue(undefined)

    await login(null, makeFormData({ email: "deleted@x.com", password: "p" }))

    expect(mockCookieSet).not.toHaveBeenCalled()
  })
})
