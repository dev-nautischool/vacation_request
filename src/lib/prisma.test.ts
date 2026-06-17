import { describe, it, expect, beforeAll, vi } from "vitest"
import type { User, AuditLog } from "@/generated/prisma/client"

// Pull the RequestStatus enum values from the generated enums module
import { RequestStatus } from "@/generated/prisma/enums"

describe("Prisma generated types", () => {
  it("User type has role field", () => {
    const u: Partial<User> = { role: "SUPERVISOR" }
    expect(u.role).toBe("SUPERVISOR")
  })

  it("User type has supervisorId and deletedAt fields", () => {
    const u: Partial<User> = { supervisorId: null, deletedAt: null }
    expect(u.supervisorId).toBeNull()
    expect(u.deletedAt).toBeNull()
  })

  it("AuditLog type does not have updatedAt field", () => {
    type NoUpdatedAt = "updatedAt" extends keyof AuditLog ? "HAS_FIELD" : "NO_FIELD"
    const check: NoUpdatedAt = "NO_FIELD"
    expect(check).toBe("NO_FIELD")
  })

  it("RequestStatus enum has all 6 values", () => {
    const statuses: RequestStatus[] = [
      RequestStatus.DRAFT,
      RequestStatus.PENDING,
      RequestStatus.APPROVED,
      RequestStatus.REJECTED,
      RequestStatus.CANCELLED,
      RequestStatus.REVOKED,
    ]
    expect(statuses).toHaveLength(6)
  })
})

describe("Prisma singleton", () => {
  beforeAll(() => {
    // Stub all required env vars so prisma.ts (which imports env.ts) doesn't throw
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret")
    vi.stubEnv("SMTP_HOST", "smtp.test")
    vi.stubEnv("SMTP_USER", "test")
    vi.stubEnv("SMTP_PASS", "test")
    vi.stubEnv("APP_URL", "http://localhost:3000")
  })

  it("returns same instance on repeated imports", async () => {
    const { prisma: a } = await import("@/lib/prisma")
    const { prisma: b } = await import("@/lib/prisma")
    expect(a).toBe(b)
  })
})
