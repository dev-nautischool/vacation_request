import { canTransition, type ActorRole } from "@/lib/request-state-machine"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import * as auditService from "@/lib/services/audit.service"
import { getFallbackSupervisorIds } from "@/lib/services/fallback.service"
import type { ActionResult } from "@/types"
import type { RequestStatus } from "@/generated/prisma/enums"

/**
 * Determines the actor's role for a specific request.
 * Returns "SUPERVISOR" if the actor directly supervises the trainer,
 * "FALLBACK" if the actor is an active fallback for the trainer's supervisor,
 * or null if the actor has no scope over this trainer.
 */
export async function resolveActorRole(
  actorId: string,
  trainerId: string,
): Promise<ActorRole | null> {
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId },
    select: { supervisorId: true },
  })
  if (!trainer?.supervisorId) return null
  if (trainer.supervisorId === actorId) return "SUPERVISOR"
  const fallbackIds = await getFallbackSupervisorIds(actorId)
  if (fallbackIds.includes(trainer.supervisorId)) return "FALLBACK"
  return null
}

export async function approveRequest(
  actorId: string,
  requestId: string,
): Promise<ActionResult<void>> {
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, trainerId: true },
  })
  if (!request) return { success: false, error: "Not found", code: ERRORS.NOT_FOUND }

  const actorRole = await resolveActorRole(actorId, request.trainerId)
  if (!actorRole) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const currentStatus = request.status as RequestStatus
  if (!canTransition(currentStatus, "APPROVED", actorRole)) {
    return { success: false, error: "Invalid transition", code: ERRORS.INVALID_TRANSITION }
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  })

  await auditService.log(actorId, "REQUEST_APPROVED", "VacationRequest", requestId, {
    actorRole,
    previousStatus: currentStatus,
  })

  return { success: true, data: undefined }
}

export async function rejectRequest(
  actorId: string,
  requestId: string,
  reason: string,
): Promise<ActionResult<void>> {
  if (!reason.trim()) {
    return { success: false, error: "A reason is required", code: ERRORS.VALIDATION_ERROR }
  }

  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, trainerId: true },
  })
  if (!request) return { success: false, error: "Not found", code: ERRORS.NOT_FOUND }

  const actorRole = await resolveActorRole(actorId, request.trainerId)
  if (!actorRole) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const currentStatus = request.status as RequestStatus
  if (!canTransition(currentStatus, "REJECTED", actorRole)) {
    return { success: false, error: "Invalid transition", code: ERRORS.INVALID_TRANSITION }
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", reason },
  })

  await auditService.log(actorId, "REQUEST_REJECTED", "VacationRequest", requestId, {
    actorRole,
    previousStatus: currentStatus,
    reason,
  })

  return { success: true, data: undefined }
}

export async function revokeRequest(
  actorId: string,
  requestId: string,
  reason: string,
): Promise<ActionResult<void>> {
  if (!reason.trim()) {
    return { success: false, error: "A reason is required", code: ERRORS.VALIDATION_ERROR }
  }

  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, trainerId: true },
  })
  if (!request) return { success: false, error: "Not found", code: ERRORS.NOT_FOUND }

  const actorRole = await resolveActorRole(actorId, request.trainerId)
  if (!actorRole || actorRole === "FALLBACK") {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const currentStatus = request.status as RequestStatus
  if (!canTransition(currentStatus, "REVOKED", "SUPERVISOR")) {
    return { success: false, error: "Invalid transition", code: ERRORS.INVALID_TRANSITION }
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "REVOKED", reason },
  })

  await auditService.log(actorId, "REQUEST_REVOKED", "VacationRequest", requestId, {
    previousStatus: currentStatus,
    reason,
  })

  return { success: true, data: undefined }
}
