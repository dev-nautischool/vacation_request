import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vacationRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    fallbackApprover: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/services/audit.service", () => ({
  log: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import * as auditService from "@/lib/services/audit.service"
import {
  resolveActorRole,
  approveRequest,
  rejectRequest,
  revokeRequest,
} from "./approval.service"

const mockVR = prisma.vacationRequest as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const mockUser = prisma.user as unknown as {
  findUnique: ReturnType<typeof vi.fn>
}
const mockFallback = prisma.fallbackApprover as unknown as {
  findMany: ReturnType<typeof vi.fn>
}
const mockAudit = auditService.log as ReturnType<typeof vi.fn>

const SUPERVISOR_ID = "supervisor-1"
const FALLBACK_SUPERVISOR_ID = "supervisor-2"
const TRAINER_ID = "trainer-1"
const REQUEST_ID = "request-1"

beforeEach(() => {
  vi.clearAllMocks()
  mockAudit.mockResolvedValue(undefined)
  mockFallback.findMany.mockResolvedValue([])
})

// ─── resolveActorRole ───────────────────────────────────────────────────────

describe("resolveActorRole", () => {
  it("returns SUPERVISOR when actor directly supervises trainer", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: SUPERVISOR_ID })
    const role = await resolveActorRole(SUPERVISOR_ID, TRAINER_ID)
    expect(role).toBe("SUPERVISOR")
  })

  it("returns FALLBACK when actor is active fallback for trainer's supervisor", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: FALLBACK_SUPERVISOR_ID })
    mockFallback.findMany.mockResolvedValue([{ supervisorId: FALLBACK_SUPERVISOR_ID }])
    const role = await resolveActorRole(SUPERVISOR_ID, TRAINER_ID)
    expect(role).toBe("FALLBACK")
  })

  it("returns null when actor has no scope over trainer", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: "other-supervisor" })
    mockFallback.findMany.mockResolvedValue([])
    const role = await resolveActorRole(SUPERVISOR_ID, TRAINER_ID)
    expect(role).toBeNull()
  })

  it("returns null when trainer not found", async () => {
    mockUser.findUnique.mockResolvedValue(null)
    const role = await resolveActorRole(SUPERVISOR_ID, TRAINER_ID)
    expect(role).toBeNull()
  })
})

// ─── approveRequest ─────────────────────────────────────────────────────────

describe("approveRequest", () => {
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: SUPERVISOR_ID })
    mockFallback.findMany.mockResolvedValue([])
    mockVR.update.mockResolvedValue({})
  })

  it("approves a PENDING request as SUPERVISOR", async () => {
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING", trainerId: TRAINER_ID })
    const result = await approveRequest(SUPERVISOR_ID, REQUEST_ID)
    expect(result.success).toBe(true)
    expect(mockVR.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: { status: "APPROVED" },
    })
    expect(mockAudit).toHaveBeenCalled()
  })

  it("approves a PENDING request as FALLBACK", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: FALLBACK_SUPERVISOR_ID })
    mockFallback.findMany.mockResolvedValue([{ supervisorId: FALLBACK_SUPERVISOR_ID }])
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING", trainerId: TRAINER_ID })
    const result = await approveRequest(SUPERVISOR_ID, REQUEST_ID)
    expect(result.success).toBe(true)
  })

  it("returns INVALID_TRANSITION when request is not PENDING", async () => {
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "APPROVED", trainerId: TRAINER_ID })
    const result = await approveRequest(SUPERVISOR_ID, REQUEST_ID)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "INVALID_TRANSITION" })
  })

  it("returns UNAUTHORIZED when actor has no scope", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: "other-supervisor" })
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING", trainerId: TRAINER_ID })
    const result = await approveRequest(SUPERVISOR_ID, REQUEST_ID)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "UNAUTHORIZED" })
  })

  it("returns NOT_FOUND when request does not exist", async () => {
    mockVR.findUnique.mockResolvedValue(null)
    const result = await approveRequest(SUPERVISOR_ID, REQUEST_ID)
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "NOT_FOUND" })
  })
})

// ─── rejectRequest ──────────────────────────────────────────────────────────

describe("rejectRequest", () => {
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: SUPERVISOR_ID })
    mockFallback.findMany.mockResolvedValue([])
    mockVR.update.mockResolvedValue({})
  })

  it("rejects a PENDING request with a reason", async () => {
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING", trainerId: TRAINER_ID })
    const result = await rejectRequest(SUPERVISOR_ID, REQUEST_ID, "Dates conflict with event")
    expect(result.success).toBe(true)
    expect(mockVR.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: { status: "REJECTED", reason: "Dates conflict with event" },
    })
  })

  it("returns VALIDATION_ERROR when reason is empty", async () => {
    const result = await rejectRequest(SUPERVISOR_ID, REQUEST_ID, "")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
  })

  it("returns VALIDATION_ERROR when reason is only whitespace", async () => {
    const result = await rejectRequest(SUPERVISOR_ID, REQUEST_ID, "   ")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
  })

  it("returns INVALID_TRANSITION when request is not PENDING", async () => {
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "REJECTED", trainerId: TRAINER_ID })
    const result = await rejectRequest(SUPERVISOR_ID, REQUEST_ID, "Some reason")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "INVALID_TRANSITION" })
  })

  it("returns UNAUTHORIZED when actor has no scope", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: "other-supervisor" })
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING", trainerId: TRAINER_ID })
    const result = await rejectRequest(SUPERVISOR_ID, REQUEST_ID, "Some reason")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "UNAUTHORIZED" })
  })
})

// ─── revokeRequest ──────────────────────────────────────────────────────────

describe("revokeRequest", () => {
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: SUPERVISOR_ID })
    mockFallback.findMany.mockResolvedValue([])
    mockVR.update.mockResolvedValue({})
  })

  it("revokes an APPROVED request as SUPERVISOR", async () => {
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "APPROVED", trainerId: TRAINER_ID })
    const result = await revokeRequest(SUPERVISOR_ID, REQUEST_ID, "Scheduling conflict")
    expect(result.success).toBe(true)
    expect(mockVR.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: { status: "REVOKED", reason: "Scheduling conflict" },
    })
  })

  it("returns VALIDATION_ERROR when reason is empty", async () => {
    const result = await revokeRequest(SUPERVISOR_ID, REQUEST_ID, "")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
  })

  it("returns INVALID_TRANSITION when request is not APPROVED", async () => {
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING", trainerId: TRAINER_ID })
    const result = await revokeRequest(SUPERVISOR_ID, REQUEST_ID, "Some reason")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "INVALID_TRANSITION" })
  })

  it("returns UNAUTHORIZED when actor is a FALLBACK approver", async () => {
    mockUser.findUnique.mockResolvedValue({ supervisorId: FALLBACK_SUPERVISOR_ID })
    mockFallback.findMany.mockResolvedValue([{ supervisorId: FALLBACK_SUPERVISOR_ID }])
    mockVR.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "APPROVED", trainerId: TRAINER_ID })
    const result = await revokeRequest(SUPERVISOR_ID, REQUEST_ID, "Some reason")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ success: false, code: "UNAUTHORIZED" })
  })
})
