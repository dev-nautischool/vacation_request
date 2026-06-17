"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { canActorPerformAction } from "@/lib/rbac"
import { ERRORS } from "@/lib/errors"
import {
  createUser as createUserService,
  removeUser as removeUserService,
  assignSupervisor as assignSupervisorService,
  configureFallback as configureFallbackService,
} from "@/lib/services/user.service"
import type { ActionResult } from "@/types"
import type { FallbackApprover, Role, User } from "@/generated/prisma/client"

async function resolveActor() {
  const session = await getSession()
  if (!session) return null

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt) return null
  return actor
}

export async function createUser(
  _prevState: ActionResult<User> | null,
  formData: FormData,
): Promise<ActionResult<User>> {
  const actor = await resolveActor()
  if (!actor) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "MANAGE_USERS")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? ""
  const role = ((formData.get("role") as string | null) ?? "TRAINER") as Role
  const password = (formData.get("password") as string | null) ?? ""

  const fields: Record<string, string> = {}
  if (!name) fields.name = "Name is required"
  if (!email) fields.email = "Email is required"
  if (!password) fields.password = "Password is required"
  if (Object.keys(fields).length > 0) {
    return { success: false, error: "All fields are required", code: ERRORS.VALIDATION_ERROR, fields }
  }

  const result = await createUserService(actor.id, { name, email, role, password })
  if (result.success) {
    revalidatePath("/users")
  }
  return result
}

export async function removeUser(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const actor = await resolveActor()
  if (!actor) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "MANAGE_USERS")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const targetUserId = (formData.get("userId") as string | null) ?? ""
  if (!targetUserId) {
    return { success: false, error: "User ID is required", code: ERRORS.VALIDATION_ERROR }
  }

  const result = await removeUserService(actor.id, targetUserId)
  if (result.success) {
    revalidatePath("/users")
  }
  return result
}

export async function assignSupervisor(
  _prevState: ActionResult<User> | null,
  formData: FormData,
): Promise<ActionResult<User>> {
  const actor = await resolveActor()
  if (!actor) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "MANAGE_USERS")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const trainerId = (formData.get("trainerId") as string | null) ?? ""
  const supervisorId = (formData.get("supervisorId") as string | null) ?? ""

  if (!trainerId || !supervisorId) {
    return {
      success: false,
      error: "Trainer and supervisor are required",
      code: ERRORS.VALIDATION_ERROR,
    }
  }

  const result = await assignSupervisorService(actor.id, trainerId, supervisorId)
  if (result.success) {
    revalidatePath("/users")
  }
  return result
}

export async function configureFallback(
  _prevState: ActionResult<FallbackApprover> | null,
  formData: FormData,
): Promise<ActionResult<FallbackApprover>> {
  const actor = await resolveActor()
  if (!actor) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "MANAGE_USERS")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const fallbackUserId = (formData.get("fallbackUserId") as string | null) ?? ""
  const expiresAtStr = (formData.get("expiresAt") as string | null) ?? ""

  if (!fallbackUserId) {
    return { success: false, error: "Fallback user is required", code: ERRORS.VALIDATION_ERROR }
  }
  if (!expiresAtStr) {
    return { success: false, error: "An expiry date is required", code: ERRORS.VALIDATION_ERROR }
  }

  const expiresAt = new Date(expiresAtStr)

  const result = await configureFallbackService(actor.id, fallbackUserId, expiresAt)
  if (result.success) {
    revalidatePath("/users")
  }
  return result
}
