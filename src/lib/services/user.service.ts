"use server"

import { hashPassword } from "better-auth/crypto"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import type { ActionResult } from "@/types"
import type { FallbackApprover, Role, User } from "@/generated/prisma/client"

export async function createUser(
  _actorId: string,
  data: { name: string; email: string; role: Role; password: string },
): Promise<ActionResult<User>> {
  const existing = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
  })
  if (existing) {
    return {
      success: false,
      error: "An account with this email already exists",
      code: ERRORS.VALIDATION_ERROR,
      fields: { email: "An account with this email already exists" },
    }
  }

  const hashedPassword = await hashPassword(data.password)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      emailVerified: true,
    },
  })

  await prisma.account.create({
    data: {
      accountId: data.email,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    },
  })

  return { success: true, data: user }
}

export async function removeUser(
  actorId: string,
  targetUserId: string,
): Promise<ActionResult<void>> {
  if (actorId === targetUserId) {
    return {
      success: false,
      error: "Cannot remove your own account",
      code: ERRORS.VALIDATION_ERROR,
    }
  }

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  })

  if (!user) {
    return { success: false, error: "User not found", code: ERRORS.NOT_FOUND }
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { deletedAt: new Date() },
  })

  return { success: true, data: undefined }
}

export async function assignSupervisor(
  actorId: string,
  trainerId: string,
  supervisorId: string,
): Promise<ActionResult<User>> {
  const trainer = await prisma.user.findFirst({
    where: { id: trainerId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!trainer) {
    return { success: false, error: "Trainer not found", code: ERRORS.NOT_FOUND }
  }
  if (trainer.role !== "TRAINER") {
    return {
      success: false,
      error: "Target user is not a trainer",
      code: ERRORS.VALIDATION_ERROR,
    }
  }

  const supervisor = await prisma.user.findFirst({
    where: { id: supervisorId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!supervisor) {
    return { success: false, error: "Supervisor not found", code: ERRORS.NOT_FOUND }
  }
  if (supervisor.role !== "SUPERVISOR") {
    return {
      success: false,
      error: "Assigned user is not a supervisor",
      code: ERRORS.VALIDATION_ERROR,
    }
  }
  if (supervisorId === actorId) {
    return {
      success: false,
      error: "Cannot assign yourself as a trainer's supervisor",
      code: ERRORS.VALIDATION_ERROR,
    }
  }

  const user = await prisma.user.update({
    where: { id: trainerId },
    data: { supervisorId },
  })

  return { success: true, data: user }
}

export async function configureFallback(
  actorId: string,
  fallbackUserId: string,
  expiresAt: Date,
): Promise<ActionResult<FallbackApprover>> {
  if (!fallbackUserId) {
    return { success: false, error: "Fallback user is required", code: ERRORS.VALIDATION_ERROR }
  }
  if (!expiresAt) {
    return { success: false, error: "An expiry date is required", code: ERRORS.VALIDATION_ERROR }
  }
  if (fallbackUserId === actorId) {
    return {
      success: false,
      error: "Cannot assign yourself as fallback approver",
      code: ERRORS.VALIDATION_ERROR,
    }
  }

  const fallbackUser = await prisma.user.findFirst({
    where: { id: fallbackUserId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!fallbackUser) {
    return { success: false, error: "User not found", code: ERRORS.NOT_FOUND }
  }
  if (fallbackUser.role !== "SUPERVISOR") {
    return {
      success: false,
      error: "Fallback approver must be a supervisor",
      code: ERRORS.VALIDATION_ERROR,
    }
  }

  await prisma.fallbackApprover.updateMany({
    where: { supervisorId: actorId, active: true },
    data: { active: false },
  })

  const record = await prisma.fallbackApprover.create({
    data: {
      supervisorId: actorId,
      fallbackUserId,
      expiresAt,
      active: true,
    },
  })

  return { success: true, data: record }
}
