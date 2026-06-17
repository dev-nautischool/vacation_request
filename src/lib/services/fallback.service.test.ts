import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fallbackApprover: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { isActiveFallbackFor, getFallbackSupervisorIds } from "./fallback.service"
import { prisma } from "@/lib/prisma"

const mockFallbackApprover = prisma.fallbackApprover as unknown as {
  findFirst: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
}

describe("isActiveFallbackFor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns true when an active non-expired record exists", async () => {
    mockFallbackApprover.findFirst.mockResolvedValueOnce({ id: "fb-1" })

    const result = await isActiveFallbackFor("sup-b", "sup-a")

    expect(result).toBe(true)
  })

  it("returns false when no matching record exists", async () => {
    mockFallbackApprover.findFirst.mockResolvedValueOnce(null)

    const result = await isActiveFallbackFor("sup-b", "sup-a")

    expect(result).toBe(false)
  })

  it("queries with active: true and expiresAt: { gt: Date } filter", async () => {
    mockFallbackApprover.findFirst.mockResolvedValueOnce(null)

    await isActiveFallbackFor("actor-id", "supervisor-id")

    expect(mockFallbackApprover.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          supervisorId: "supervisor-id",
          fallbackUserId: "actor-id",
          active: true,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    )
  })
})

describe("getFallbackSupervisorIds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns supervisor IDs from active non-expired records", async () => {
    mockFallbackApprover.findMany.mockResolvedValueOnce([
      { supervisorId: "sup-a" },
      { supervisorId: "sup-b" },
    ])

    const result = await getFallbackSupervisorIds("actor-id")

    expect(result).toEqual(["sup-a", "sup-b"])
  })

  it("returns empty array when no active records exist", async () => {
    mockFallbackApprover.findMany.mockResolvedValueOnce([])

    const result = await getFallbackSupervisorIds("actor-id")

    expect(result).toEqual([])
  })

  it("queries with active: true and expiresAt: { gt: Date } filter", async () => {
    mockFallbackApprover.findMany.mockResolvedValueOnce([])

    await getFallbackSupervisorIds("actor-id")

    expect(mockFallbackApprover.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fallbackUserId: "actor-id",
          active: true,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    )
  })
})
