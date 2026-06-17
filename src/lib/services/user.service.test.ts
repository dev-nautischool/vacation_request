import { describe, it, expect, vi, beforeEach } from "vitest"
import { ERRORS } from "@/lib/errors"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      create: vi.fn(),
    },
    fallbackApprover: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}))

import { createUser, removeUser, assignSupervisor, configureFallback } from "./user.service"
import { prisma } from "@/lib/prisma"

const mockUser = prisma.user as unknown as {
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const mockAccount = prisma.account as unknown as {
  create: ReturnType<typeof vi.fn>
}
const mockFallbackApprover = prisma.fallbackApprover as unknown as {
  updateMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
}

const fakeUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@test.com",
  role: "TRAINER" as const,
  emailVerified: true,
  image: null,
  supervisorId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates user and account records on success", async () => {
    mockUser.findFirst.mockResolvedValue(null)
    mockUser.create.mockResolvedValue(fakeUser)
    mockAccount.create.mockResolvedValue({})

    const result = await createUser("actor-1", {
      name: "Alice",
      email: "alice@test.com",
      role: "TRAINER",
      password: "Password1!",
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual(fakeUser)
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "alice@test.com", role: "TRAINER", emailVerified: true }),
      }),
    )
    expect(mockAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: "credential",
          accountId: "alice@test.com",
          password: "hashed-password",
        }),
      }),
    )
  })

  it("returns VALIDATION_ERROR when email already exists", async () => {
    mockUser.findFirst.mockResolvedValue(fakeUser)

    const result = await createUser("actor-1", {
      name: "Alice",
      email: "alice@test.com",
      role: "TRAINER",
      password: "Password1!",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
      expect(result.fields?.email).toBeTruthy()
    }
    expect(mockUser.create).not.toHaveBeenCalled()
  })
})

describe("removeUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sets deletedAt on the target user", async () => {
    mockUser.findFirst.mockResolvedValue(fakeUser)
    mockUser.update.mockResolvedValue({ ...fakeUser, deletedAt: new Date() })

    const result = await removeUser("actor-1", "user-1")

    expect(result.success).toBe(true)
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })

  it("returns VALIDATION_ERROR when actor tries to remove themselves", async () => {
    const result = await removeUser("actor-1", "actor-1")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("returns NOT_FOUND when user does not exist or is already deleted", async () => {
    mockUser.findFirst.mockResolvedValue(null)

    const result = await removeUser("actor-1", "ghost-user")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.NOT_FOUND)
    expect(mockUser.update).not.toHaveBeenCalled()
  })
})

const fakeSupervisor = {
  id: "sup-1",
  name: "Bob",
  email: "bob@test.com",
  role: "SUPERVISOR" as const,
  emailVerified: true,
  image: null,
  supervisorId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("assignSupervisor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates supervisorId on success", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER" })
      .mockResolvedValueOnce({ id: "sup-1", role: "SUPERVISOR" })
    mockUser.update.mockResolvedValue({ ...fakeUser, id: "trainer-1", supervisorId: "sup-1" })

    const result = await assignSupervisor("actor-sup", "trainer-1", "sup-1")

    expect(result.success).toBe(true)
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "trainer-1" },
        data: { supervisorId: "sup-1" },
      }),
    )
  })

  it("replaces existing assignment (no unique constraint prevents update)", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER" })
      .mockResolvedValueOnce({ id: "sup-2", role: "SUPERVISOR" })
    mockUser.update.mockResolvedValue({ ...fakeUser, id: "trainer-1", supervisorId: "sup-2" })

    const result = await assignSupervisor("actor-sup", "trainer-1", "sup-2")

    expect(result.success).toBe(true)
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { supervisorId: "sup-2" } }),
    )
  })

  it("returns VALIDATION_ERROR when supervisorId === actorId", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER" })
      .mockResolvedValueOnce({ id: "actor-sup", role: "SUPERVISOR" })

    const result = await assignSupervisor("actor-sup", "trainer-1", "actor-sup")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("returns NOT_FOUND when trainer does not exist", async () => {
    mockUser.findFirst.mockResolvedValueOnce(null)

    const result = await assignSupervisor("actor-sup", "ghost-trainer", "sup-1")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.NOT_FOUND)
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when target user is not a TRAINER", async () => {
    mockUser.findFirst.mockResolvedValueOnce({ id: "sup-2", role: "SUPERVISOR" })

    const result = await assignSupervisor("actor-sup", "sup-2", "sup-1")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when assigned user is not a SUPERVISOR", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER" })
      .mockResolvedValueOnce({ id: "trainer-2", role: "TRAINER" })

    const result = await assignSupervisor("actor-sup", "trainer-1", "trainer-2")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("returns NOT_FOUND when supervisor does not exist", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER" })
      .mockResolvedValueOnce(null)

    const result = await assignSupervisor("actor-sup", "trainer-1", "ghost-sup")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.NOT_FOUND)
    expect(mockUser.update).not.toHaveBeenCalled()
  })
})

const fakeFallbackRecord = {
  id: "fb-1",
  supervisorId: "actor-sup",
  fallbackUserId: "sup-2",
  expiresAt: new Date("2026-12-31"),
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("configureFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deactivates existing and creates new fallback record on success", async () => {
    mockUser.findFirst.mockResolvedValueOnce({ id: "sup-2", role: "SUPERVISOR" })
    mockFallbackApprover.updateMany.mockResolvedValueOnce({ count: 1 })
    mockFallbackApprover.create.mockResolvedValueOnce(fakeFallbackRecord)

    const result = await configureFallback("actor-sup", "sup-2", new Date("2026-12-31"))

    expect(result.success).toBe(true)
    expect(mockFallbackApprover.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { supervisorId: "actor-sup", active: true },
        data: { active: false },
      }),
    )
    expect(mockFallbackApprover.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supervisorId: "actor-sup",
          fallbackUserId: "sup-2",
          active: true,
        }),
      }),
    )
  })

  it("returns VALIDATION_ERROR when fallbackUserId is empty", async () => {
    const result = await configureFallback("actor-sup", "", new Date("2026-12-31"))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockFallbackApprover.create).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when fallbackUserId === actorId (self-assignment)", async () => {
    const result = await configureFallback("actor-sup", "actor-sup", new Date("2026-12-31"))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockFallbackApprover.create).not.toHaveBeenCalled()
  })

  it("returns NOT_FOUND when fallback user does not exist", async () => {
    mockUser.findFirst.mockResolvedValueOnce(null)

    const result = await configureFallback("actor-sup", "ghost-user", new Date("2026-12-31"))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.NOT_FOUND)
    expect(mockFallbackApprover.create).not.toHaveBeenCalled()
  })

  it("returns VALIDATION_ERROR when fallback user is not a SUPERVISOR", async () => {
    mockUser.findFirst.mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER" })

    const result = await configureFallback("actor-sup", "trainer-1", new Date("2026-12-31"))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe(ERRORS.VALIDATION_ERROR)
    expect(mockFallbackApprover.create).not.toHaveBeenCalled()
  })
})
