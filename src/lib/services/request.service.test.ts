import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vacationRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock("@/lib/services/audit.service", () => ({
  log: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import * as auditService from "@/lib/services/audit.service"
import {
  checkOverlap,
  submitRequest,
  saveDraft,
  deleteDraft,
  cancelRequest,
  getBlockedDateRanges,
} from "./request.service"

const mockVR = prisma.vacationRequest as unknown as {
  findFirst: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const mockAudit = auditService.log as ReturnType<typeof vi.fn>

const TRAINER_ID = "trainer-1"
const START = new Date("2026-08-10T22:00:00Z") // Aug 11 Zurich
const END = new Date("2026-08-14T22:00:00Z") // Aug 15 Zurich

describe("checkOverlap", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns false when no conflict exists", async () => {
    mockVR.findFirst.mockResolvedValue(null)
    expect(await checkOverlap(TRAINER_ID, START, END)).toBe(false)
  })

  it("returns true when a conflict exists", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "req-1" })
    expect(await checkOverlap(TRAINER_ID, START, END)).toBe(true)
  })
})

describe("getBlockedDateRanges", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns PENDING and APPROVED request ranges", async () => {
    const ranges = [{ startDate: START, endDate: END }]
    mockVR.findMany.mockResolvedValue(ranges)
    const result = await getBlockedDateRanges(TRAINER_ID)
    expect(result).toEqual(ranges)
    expect(mockVR.findMany).toHaveBeenCalledWith({
      where: { trainerId: TRAINER_ID, status: { in: ["PENDING", "APPROVED"] } },
      select: { startDate: true, endDate: true },
    })
  })
})

describe("submitRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVR.findFirst.mockResolvedValue(null) // no overlap
    mockVR.create.mockResolvedValue({ id: "req-new" })
    mockAudit.mockResolvedValue(undefined)
  })

  it("creates a PENDING request when no overlap", async () => {
    const result = await submitRequest(TRAINER_ID, START, END, 5)

    expect(result).toEqual({ success: true, data: { id: "req-new" } })
    expect(mockVR.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ trainerId: TRAINER_ID, status: "PENDING", daysCount: 5 }),
    })
    expect(mockAudit).toHaveBeenCalledWith(
      TRAINER_ID,
      "REQUEST_SUBMITTED",
      "VacationRequest",
      "req-new",
      expect.any(Object),
    )
  })

  it("returns OVERLAP_CONFLICT when dates overlap", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "existing" })

    const result = await submitRequest(TRAINER_ID, START, END, 5)

    expect(result).toEqual({
      success: false,
      error: expect.any(String),
      code: "OVERLAP_CONFLICT",
    })
    expect(mockVR.create).not.toHaveBeenCalled()
    expect(mockAudit).not.toHaveBeenCalled()
  })
})

describe("saveDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAudit.mockResolvedValue(undefined)
  })

  it("creates a new DRAFT when none exists", async () => {
    mockVR.findFirst.mockResolvedValue(null)
    mockVR.create.mockResolvedValue({ id: "draft-new" })

    const result = await saveDraft(TRAINER_ID, START, END, 5)

    expect(result).toEqual({ success: true, data: { id: "draft-new" } })
    expect(mockVR.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "DRAFT" }),
    })
  })

  it("updates existing DRAFT instead of creating a new one", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "draft-existing" })
    mockVR.update.mockResolvedValue({ id: "draft-existing" })

    const result = await saveDraft(TRAINER_ID, START, END, 5)

    expect(result).toEqual({ success: true, data: { id: "draft-existing" } })
    expect(mockVR.create).not.toHaveBeenCalled()
    expect(mockVR.update).toHaveBeenCalledWith({
      where: { id: "draft-existing" },
      data: expect.objectContaining({ startDate: START, endDate: END, daysCount: 5 }),
    })
  })
})

describe("deleteDraft", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes an owned DRAFT successfully", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "draft-1" })
    mockVR.delete.mockResolvedValue({ id: "draft-1" })

    const result = await deleteDraft(TRAINER_ID, "draft-1")

    expect(result).toEqual({ success: true, data: undefined })
    expect(mockVR.delete).toHaveBeenCalledWith({ where: { id: "draft-1" } })
  })

  it("returns NOT_FOUND if draft doesn't exist or belongs to other trainer", async () => {
    mockVR.findFirst.mockResolvedValue(null)

    const result = await deleteDraft(TRAINER_ID, "draft-other")

    expect(result).toEqual({ success: false, error: expect.any(String), code: "NOT_FOUND" })
    expect(mockVR.delete).not.toHaveBeenCalled()
  })
})

describe("cancelRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAudit.mockResolvedValue(undefined)
  })

  it("cancels a PENDING request", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "req-1", status: "PENDING" })
    mockVR.update.mockResolvedValue({ id: "req-1" })

    const result = await cancelRequest(TRAINER_ID, "req-1")

    expect(result).toEqual({ success: true, data: undefined })
    expect(mockVR.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "CANCELLED" },
    })
    expect(mockAudit).toHaveBeenCalledWith(
      TRAINER_ID,
      "REQUEST_CANCELLED",
      "VacationRequest",
      "req-1",
      { previousStatus: "PENDING" },
    )
  })

  it("cancels an APPROVED request", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "req-1", status: "APPROVED" })
    mockVR.update.mockResolvedValue({ id: "req-1" })

    const result = await cancelRequest(TRAINER_ID, "req-1")

    expect(result).toEqual({ success: true, data: undefined })
  })

  it("returns INVALID_TRANSITION for REJECTED request", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "req-1", status: "REJECTED" })

    const result = await cancelRequest(TRAINER_ID, "req-1")

    expect(result).toEqual({
      success: false,
      error: expect.any(String),
      code: "INVALID_TRANSITION",
    })
    expect(mockVR.update).not.toHaveBeenCalled()
    expect(mockAudit).not.toHaveBeenCalled()
  })

  it("returns INVALID_TRANSITION for CANCELLED request", async () => {
    mockVR.findFirst.mockResolvedValue({ id: "req-1", status: "CANCELLED" })

    const result = await cancelRequest(TRAINER_ID, "req-1")

    expect(result).toEqual({
      success: false,
      error: expect.any(String),
      code: "INVALID_TRANSITION",
    })
  })

  it("returns NOT_FOUND if request doesn't exist or belongs to other trainer", async () => {
    mockVR.findFirst.mockResolvedValue(null)

    const result = await cancelRequest(TRAINER_ID, "req-other")

    expect(result).toEqual({ success: false, error: expect.any(String), code: "NOT_FOUND" })
  })
})
