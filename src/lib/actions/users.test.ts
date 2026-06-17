import { describe, it, expect, vi, beforeEach } from "vitest"
import { ERRORS } from "@/lib/errors"
import type { ActionResult } from "@/types"
import type { User } from "@/generated/prisma/client"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/services/user.service", () => ({
  createUser: vi.fn(),
  removeUser: vi.fn(),
  assignSupervisor: vi.fn(),
  configureFallback: vi.fn(),
}))

import { createUser, removeUser, assignSupervisor, configureFallback } from "./users"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import * as userService from "@/lib/services/user.service"

const mockFindUnique = prisma.user as unknown as { findUnique: ReturnType<typeof vi.fn> }
const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>
const mockCreateUserService = userService.createUser as unknown as ReturnType<typeof vi.fn>
const mockRemoveUserService = userService.removeUser as unknown as ReturnType<typeof vi.fn>
const mockAssignSupervisorService = userService.assignSupervisor as unknown as ReturnType<typeof vi.fn>
const mockConfigureFallbackService = userService.configureFallback as unknown as ReturnType<typeof vi.fn>

const supervisorActor = { id: "sup-1", role: "SUPERVISOR" as const, deletedAt: null }
const trainerActor = { id: "trainer-1", role: "TRAINER" as const, deletedAt: null }

const fakeUser: User = {
  id: "new-user-1",
  name: "Bob",
  email: "bob@test.com",
  role: "TRAINER",
  emailVerified: true,
  image: null,
  supervisorId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const fakeFallback = {
  id: "fb-1",
  supervisorId: "sup-1",
  fallbackUserId: "sup-2",
  expiresAt: new Date("2026-12-31"),
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

describe("createUser action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns UNAUTHORIZED when session is missing", async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await createUser(
      null,
      makeFormData({ name: "Bob", email: "bob@test.com", role: "TRAINER", password: "Pass1!" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
  })

  it("returns UNAUTHORIZED when actor is a TRAINER", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "trainer-1" } })
    mockFindUnique.findUnique.mockResolvedValue(trainerActor)

    const result = await createUser(
      null,
      makeFormData({ name: "Bob", email: "bob@test.com", role: "TRAINER", password: "Pass1!" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    expect(mockCreateUserService).not.toHaveBeenCalled()
  })

  it("delegates to service and returns success for SUPERVISOR", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)
    mockCreateUserService.mockResolvedValue({ success: true, data: fakeUser })

    const result = await createUser(
      null,
      makeFormData({ name: "Bob", email: "bob@test.com", role: "TRAINER", password: "Pass1!" }),
    )

    expect(result.success).toBe(true)
    expect(mockCreateUserService).toHaveBeenCalledWith(
      "sup-1",
      expect.objectContaining({ name: "Bob", email: "bob@test.com", role: "TRAINER" }),
    )
  })

  it("returns VALIDATION_ERROR for missing required fields", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)

    const result = await createUser(
      null,
      makeFormData({ name: "", email: "", role: "TRAINER", password: "" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
      expect(result.fields).toBeDefined()
    }
    expect(mockCreateUserService).not.toHaveBeenCalled()
  })
})

describe("removeUser action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns UNAUTHORIZED when session is missing", async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await removeUser(null, makeFormData({ userId: "user-1" }))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
  })

  it("returns UNAUTHORIZED when actor is a TRAINER", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "trainer-1" } })
    mockFindUnique.findUnique.mockResolvedValue(trainerActor)

    const result = await removeUser(null, makeFormData({ userId: "user-1" }))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    expect(mockRemoveUserService).not.toHaveBeenCalled()
  })

  it("delegates to service and returns success for SUPERVISOR", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)
    mockRemoveUserService.mockResolvedValue({ success: true, data: undefined })

    const result = await removeUser(null, makeFormData({ userId: "user-to-remove" }))

    expect(result.success).toBe(true)
    expect(mockRemoveUserService).toHaveBeenCalledWith("sup-1", "user-to-remove")
  })

  it("returns VALIDATION_ERROR when userId is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)

    const result = await removeUser(null, makeFormData({}))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockRemoveUserService).not.toHaveBeenCalled()
  })
})

describe("assignSupervisor action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns UNAUTHORIZED when session is missing", async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await assignSupervisor(
      null,
      makeFormData({ trainerId: "t1", supervisorId: "s1" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
  })

  it("returns UNAUTHORIZED when actor is a TRAINER", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "trainer-1" } })
    mockFindUnique.findUnique.mockResolvedValue(trainerActor)

    const result = await assignSupervisor(
      null,
      makeFormData({ trainerId: "t1", supervisorId: "s1" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    expect(mockAssignSupervisorService).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when trainerId or supervisorId is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)

    const result = await assignSupervisor(null, makeFormData({ trainerId: "t1" }))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockAssignSupervisorService).not.toHaveBeenCalled()
  })

  it("delegates to service for SUPERVISOR with valid inputs", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)
    mockAssignSupervisorService.mockResolvedValue({ success: true, data: fakeUser })

    const result = await assignSupervisor(
      null,
      makeFormData({ trainerId: "t1", supervisorId: "s2" }),
    )

    expect(result.success).toBe(true)
    expect(mockAssignSupervisorService).toHaveBeenCalledWith("sup-1", "t1", "s2")
  })
})

describe("configureFallback action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns UNAUTHORIZED when session is missing", async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await configureFallback(
      null,
      makeFormData({ fallbackUserId: "sup-2", expiresAt: "2026-12-31" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
  })

  it("returns UNAUTHORIZED when actor is a TRAINER", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "trainer-1" } })
    mockFindUnique.findUnique.mockResolvedValue(trainerActor)

    const result = await configureFallback(
      null,
      makeFormData({ fallbackUserId: "sup-2", expiresAt: "2026-12-31" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.UNAUTHORIZED)
    expect(mockConfigureFallbackService).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when fallbackUserId is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)

    const result = await configureFallback(
      null,
      makeFormData({ expiresAt: "2026-12-31" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockConfigureFallbackService).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when expiresAt is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)

    const result = await configureFallback(
      null,
      makeFormData({ fallbackUserId: "sup-2" }),
    )

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockConfigureFallbackService).not.toHaveBeenCalled()
  })

  it("delegates to service for SUPERVISOR with valid inputs", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "sup-1" } })
    mockFindUnique.findUnique.mockResolvedValue(supervisorActor)
    mockConfigureFallbackService.mockResolvedValue({ success: true, data: fakeFallback })

    const result = await configureFallback(
      null,
      makeFormData({ fallbackUserId: "sup-2", expiresAt: "2026-12-31" }),
    )

    expect(result.success).toBe(true)
    expect(mockConfigureFallbackService).toHaveBeenCalledWith(
      "sup-1",
      "sup-2",
      expect.any(Date),
    )
  })
})
