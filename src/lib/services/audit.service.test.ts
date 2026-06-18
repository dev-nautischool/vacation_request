import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { log } from "./audit.service"

const mockAuditLog = prisma.auditLog as unknown as {
  create: ReturnType<typeof vi.fn>
}

describe("audit.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  it("inserts an audit_log record with correct fields", async () => {
    await log("actor-1", "REQUEST_SUBMITTED", "VacationRequest", "req-1", { note: "test" })

    expect(mockAuditLog.create).toHaveBeenCalledOnce()
    const call = mockAuditLog.create.mock.calls[0][0]
    expect(call.data.actorId).toBe("actor-1")
    expect(call.data.action).toBe("REQUEST_SUBMITTED")
    expect(call.data.entityType).toBe("VacationRequest")
    expect(call.data.entityId).toBe("req-1")
    expect(call.data.metadata).toEqual({ note: "test" })
  })

  it("includes a timestamp (Date instance)", async () => {
    await log("actor-1", "REQUEST_CANCELLED", "VacationRequest", "req-2", {})

    const call = mockAuditLog.create.mock.calls[0][0]
    expect(call.data.timestamp).toBeInstanceOf(Date)
  })

  it("never calls update or delete on audit_logs", async () => {
    await log("actor-1", "DRAFT_SAVED", "VacationRequest", "req-3", {})

    expect(prisma.auditLog).not.toHaveProperty("update")
    expect(prisma.auditLog).not.toHaveProperty("delete")
  })
})
