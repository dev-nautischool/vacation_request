import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    entitlement: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/services/audit.service", () => ({
  log: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import * as auditService from "@/lib/services/audit.service"
import { setEntitlement, getEntitlementStatus } from "./entitlement.service"

const mockEntitlement = prisma.entitlement as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const mockUser = prisma.user as unknown as {
  findUnique: ReturnType<typeof vi.fn>
}
const mockAudit = auditService.log as ReturnType<typeof vi.fn>

const SUPERVISOR_ID = "supervisor-1"
const TRAINER_ID = "trainer-1"
const YEAR = 2026
const DAYS = 25

beforeEach(() => {
  vi.clearAllMocks()
  mockAudit.mockResolvedValue(undefined)
})

// ─── getEntitlementStatus ────────────────────────────────────────────────────

describe("getEntitlementStatus", () => {
  it("returns null days and isLocked=false when no entitlement exists", async () => {
    mockEntitlement.findUnique.mockResolvedValue(null)
    const result = await getEntitlementStatus(TRAINER_ID, YEAR)
    expect(result).toEqual({ days: null, isLocked: false, graceDaysRemaining: null })
  })

  it("returns days and isLocked=false when within grace period", async () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    mockEntitlement.findUnique.mockResolvedValue({ days: DAYS, createdAt: recentDate })
    const result = await getEntitlementStatus(TRAINER_ID, YEAR)
    expect(result.days).toBe(DAYS)
    expect(result.isLocked).toBe(false)
    expect(result.graceDaysRemaining).toBe(8)
  })

  it("returns isLocked=true when past grace period", async () => {
    const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    mockEntitlement.findUnique.mockResolvedValue({ days: DAYS, createdAt: oldDate })
    const result = await getEntitlementStatus(TRAINER_ID, YEAR)
    expect(result.isLocked).toBe(true)
    expect(result.graceDaysRemaining).toBe(0)
  })
})

// ─── setEntitlement ──────────────────────────────────────────────────────────

describe("setEntitlement", () => {
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: SUPERVISOR_ID })
  })

  it("creates a new entitlement when none exists", async () => {
    mockEntitlement.findUnique.mockResolvedValue(null)
    mockEntitlement.create.mockResolvedValue({ id: "ent-1" })

    const result = await setEntitlement(SUPERVISOR_ID, TRAINER_ID, YEAR, DAYS)
    expect(result.success).toBe(true)
    expect(mockEntitlement.create).toHaveBeenCalledWith({
      data: { trainerId: TRAINER_ID, year: YEAR, days: DAYS },
    })
    expect(mockAudit).toHaveBeenCalledWith(
      SUPERVISOR_ID,
      "ENTITLEMENT_SET",
      "Entitlement",
      "ent-1",
      expect.objectContaining({ year: YEAR, days: DAYS }),
    )
  })

  it("updates an existing entitlement within the grace period", async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    mockEntitlement.findUnique.mockResolvedValue({ id: "ent-1", createdAt: recentDate })
    mockEntitlement.update.mockResolvedValue({})

    const result = await setEntitlement(SUPERVISOR_ID, TRAINER_ID, YEAR, 30)
    expect(result.success).toBe(true)
    expect(mockEntitlement.update).toHaveBeenCalledWith({
      where: { id: "ent-1" },
      data: { days: 30 },
    })
    expect(mockAudit).toHaveBeenCalledWith(
      SUPERVISOR_ID,
      "ENTITLEMENT_UPDATED",
      "Entitlement",
      "ent-1",
      expect.objectContaining({ year: YEAR, days: 30 }),
    )
  })

  it("returns ENTITLEMENT_LOCKED when past 10-day grace period", async () => {
    const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    mockEntitlement.findUnique.mockResolvedValue({ id: "ent-1", createdAt: oldDate })

    const result = await setEntitlement(SUPERVISOR_ID, TRAINER_ID, YEAR, DAYS)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "ENTITLEMENT_LOCKED" })
    expect(mockEntitlement.update).not.toHaveBeenCalled()
  })

  it("returns UNAUTHORIZED when trainer does not belong to supervisor", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: "other-supervisor" })

    const result = await setEntitlement(SUPERVISOR_ID, TRAINER_ID, YEAR, DAYS)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "UNAUTHORIZED" })
  })

  it("returns UNAUTHORIZED when trainer not found", async () => {
    mockUser.findUnique.mockResolvedValue(null)

    const result = await setEntitlement(SUPERVISOR_ID, TRAINER_ID, YEAR, DAYS)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "UNAUTHORIZED" })
  })
})
