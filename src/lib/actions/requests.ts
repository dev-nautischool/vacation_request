"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { canActorPerformAction } from "@/lib/rbac"
import { ERRORS } from "@/lib/errors"
import {
  submitRequest as submitRequestService,
  saveDraft as saveDraftService,
  deleteDraft as deleteDraftService,
  cancelRequest as cancelRequestService,
} from "@/lib/services/request.service"
import type { ActionResult } from "@/types"

async function resolveTrainer() {
  const session = await getSession()
  if (!session) return null
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "TRAINER") return null
  return actor
}

export async function submitRequest(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const actor = await resolveTrainer()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "SUBMIT_REQUEST")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const startRaw = formData.get("startDate") as string | null
  const endRaw = formData.get("endDate") as string | null
  const daysRaw = formData.get("daysCount") as string | null

  if (!startRaw || !endRaw || !daysRaw) {
    return { success: false, error: "Missing required fields", code: ERRORS.VALIDATION_ERROR }
  }

  const startDate = new Date(startRaw)
  const endDate = new Date(endRaw)
  const daysCount = parseInt(daysRaw, 10)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(daysCount)) {
    return { success: false, error: "Invalid date values", code: ERRORS.VALIDATION_ERROR }
  }
  if (endDate < startDate) {
    return { success: false, error: "End date must be on or after start date", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await submitRequestService(actor.id, startDate, endDate, daysCount)
  if (result.success) {
    revalidatePath("/dashboard")
    revalidatePath("/requests")
  }
  return result
}

export async function saveDraft(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const actor = await resolveTrainer()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "SAVE_DRAFT")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const startRaw = formData.get("startDate") as string | null
  const endRaw = formData.get("endDate") as string | null
  const daysRaw = formData.get("daysCount") as string | null

  if (!startRaw || !endRaw || !daysRaw) {
    return { success: false, error: "Missing required fields", code: ERRORS.VALIDATION_ERROR }
  }

  const startDate = new Date(startRaw)
  const endDate = new Date(endRaw)
  const daysCount = parseInt(daysRaw, 10)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(daysCount)) {
    return { success: false, error: "Invalid date values", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await saveDraftService(actor.id, startDate, endDate, daysCount)
  if (result.success) {
    revalidatePath("/dashboard")
  }
  return result
}

export async function deleteDraft(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const actor = await resolveTrainer()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const draftId = formData.get("draftId") as string | null
  if (!draftId) {
    return { success: false, error: "Missing draftId", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await deleteDraftService(actor.id, draftId)
  if (result.success) {
    revalidatePath("/dashboard")
  }
  return result
}

export async function cancelRequest(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const actor = await resolveTrainer()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "CANCEL_REQUEST")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const requestId = formData.get("requestId") as string | null
  if (!requestId) {
    return { success: false, error: "Missing requestId", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await cancelRequestService(actor.id, requestId)
  if (result.success) {
    revalidatePath("/requests")
    revalidatePath("/dashboard")
  }
  return result
}
