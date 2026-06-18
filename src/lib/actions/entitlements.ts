"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import { setEntitlement as setEntitlementService } from "@/lib/services/entitlement.service"
import type { ActionResult } from "@/types"

export async function setEntitlement(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "SUPERVISOR") {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const trainerId = formData.get("trainerId") as string | null
  const yearRaw = formData.get("year") as string | null
  const daysRaw = formData.get("days") as string | null

  if (!trainerId || !yearRaw || !daysRaw) {
    return { success: false, error: "Missing required fields", code: ERRORS.VALIDATION_ERROR }
  }

  const year = parseInt(yearRaw, 10)
  const days = parseInt(daysRaw, 10)

  if (isNaN(year) || isNaN(days) || days < 1) {
    return { success: false, error: "Invalid values", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await setEntitlementService(actor.id, trainerId, year, days)
  if (result.success) {
    revalidatePath(`/trainers/${trainerId}`)
    revalidatePath("/dashboard")
  }
  return result
}
