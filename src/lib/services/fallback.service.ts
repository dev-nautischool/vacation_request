import { prisma } from "@/lib/prisma"

export async function isActiveFallbackFor(actorId: string, supervisorId: string): Promise<boolean> {
  const record = await prisma.fallbackApprover.findFirst({
    where: {
      supervisorId,
      fallbackUserId: actorId,
      active: true,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  return record !== null
}

export async function getFallbackSupervisorIds(actorId: string): Promise<string[]> {
  const records = await prisma.fallbackApprover.findMany({
    where: {
      fallbackUserId: actorId,
      active: true,
      expiresAt: { gt: new Date() },
    },
    select: { supervisorId: true },
  })
  return records.map((r) => r.supervisorId)
}
