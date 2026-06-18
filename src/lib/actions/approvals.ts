"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import {
  approveRequest as approveRequestService,
  rejectRequest as rejectRequestService,
  revokeRequest as revokeRequestService,
} from "@/lib/services/approval.service"
import type { ActionResult } from "@/types"

async function resolveSupervisor() {
  const session = await getSession()
  if (!session) return null
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "SUPERVISOR") return null
  return actor
}

export async function approveRequest(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const actor = await resolveSupervisor()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const requestId = formData.get("requestId") as string | null
  if (!requestId) {
    return { success: false, error: "Missing requestId", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await approveRequestService(actor.id, requestId)
  if (result.success) {
    revalidatePath("/approvals")
    revalidatePath("/dashboard")
    redirect("/approvals")
  }
  return result
}

export async function rejectRequest(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const actor = await resolveSupervisor()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const requestId = formData.get("requestId") as string | null
  const reason = (formData.get("reason") as string | null) ?? ""

  if (!requestId) {
    return { success: false, error: "Missing requestId", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await rejectRequestService(actor.id, requestId, reason)
  if (result.success) {
    revalidatePath("/approvals")
    revalidatePath("/dashboard")
    redirect("/approvals")
  }
  return result
}

export async function revokeRequest(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const actor = await resolveSupervisor()
  if (!actor) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const requestId = formData.get("requestId") as string | null
  const reason = (formData.get("reason") as string | null) ?? ""

  if (!requestId) {
    return { success: false, error: "Missing requestId", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await revokeRequestService(actor.id, requestId, reason)
  if (result.success) {
    revalidatePath("/approvals")
    revalidatePath("/dashboard")
    redirect("/approvals")
  }
  return result
}
