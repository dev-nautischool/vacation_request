import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

export async function log(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      timestamp: new Date(),
      metadata: metadata as Prisma.InputJsonValue,
    },
  })
}
