import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import * as auditService from "@/lib/services/audit.service"
import type { ActionResult } from "@/types"

const MAX_ENTITLEMENT_EDIT_DAYS = 10

export interface EntitlementStatus {
  days: number | null
  isLocked: boolean
  graceDaysRemaining: number | null
}

export async function getEntitlementStatus(
  trainerId: string,
  year: number,
): Promise<EntitlementStatus> {
  const existing = await prisma.entitlement.findUnique({
    where: { trainerId_year: { trainerId, year } },
    select: { days: true, createdAt: true },
  })

  if (!existing) {
    return { days: null, isLocked: false, graceDaysRemaining: null }
  }

  const daysSinceCreated = Math.floor(
    (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  )
  const isLocked = daysSinceCreated > MAX_ENTITLEMENT_EDIT_DAYS
  const graceDaysRemaining = isLocked ? 0 : MAX_ENTITLEMENT_EDIT_DAYS - daysSinceCreated

  return { days: existing.days, isLocked, graceDaysRemaining }
}

export async function setEntitlement(
  supervisorId: string,
  trainerId: string,
  year: number,
  days: number,
): Promise<ActionResult<void>> {
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId, deletedAt: null },
    select: { supervisorId: true },
  })
  if (!trainer || trainer.supervisorId !== supervisorId) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const existing = await prisma.entitlement.findUnique({
    where: { trainerId_year: { trainerId, year } },
    select: { id: true, createdAt: true },
  })

  if (existing) {
    const daysSinceCreated = Math.floor(
      (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysSinceCreated > MAX_ENTITLEMENT_EDIT_DAYS) {
      return { success: false, error: "Entitlement locked", code: ERRORS.ENTITLEMENT_LOCKED }
    }
    await prisma.entitlement.update({ where: { id: existing.id }, data: { days } })
    await auditService.log(supervisorId, "ENTITLEMENT_UPDATED", "Entitlement", existing.id, {
      year,
      days,
    })
  } else {
    const rec = await prisma.entitlement.create({ data: { trainerId, year, days } })
    await auditService.log(supervisorId, "ENTITLEMENT_SET", "Entitlement", rec.id, { year, days })
  }

  return { success: true, data: undefined }
}
