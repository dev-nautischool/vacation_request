import { describe, it, expect, vi, beforeEach } from "vitest"
import { ERRORS } from "@/lib/errors"
import type { ActionResult } from "@/types"

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
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

import { login } from "./auth"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const mockPrismaUser = prisma.user as unknown as { findFirst: ReturnType<typeof vi.fn> }
const mockSignIn = auth.api.signInEmail as ReturnType<typeof vi.fn>

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

describe("login action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns UNAUTHORIZED when user does not exist", async () => {
    mockPrismaUser.findFirst.mockResolvedValue(null)

    const result = await login(null, makeFormData({ email: "x@x.com", password: "pw" }))

    expect(result).toEqual<ActionResult<{ redirectTo: string }>>({
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("returns UNAUTHORIZED for deleted user (deletedAt set)", async () => {
    mockPrismaUser.findFirst.mockResolvedValue(null)

    const result = await login(
      null,
      makeFormData({ email: "deleted@x.com", password: "pw" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    }
    expect(mockSignIn).not.toHaveBeenCalled()
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
    mockPrismaUser.findFirst.mockResolvedValue({ id: "user-1" })
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })

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
    mockPrismaUser.findFirst.mockResolvedValue({ id: "user-1" })
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })

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
    mockPrismaUser.findFirst.mockResolvedValue({ id: "user-1" })
    mockSignIn.mockResolvedValue({ user: { id: "user-1" } })

    const result = await login(
      null,
      makeFormData({ email: "a@x.com", password: "p", returnTo: "http://evil.com" }),
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.redirectTo).toBe("/dashboard")
    }
  })
})
