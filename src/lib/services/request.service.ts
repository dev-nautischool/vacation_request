import { canTransition } from "@/lib/request-state-machine"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import * as auditService from "@/lib/services/audit.service"
import type { ActionResult } from "@/types"
import type { RequestStatus } from "@/generated/prisma/enums"

export interface BlockedRange {
  startDate: Date
  endDate: Date
}

/**
 * Returns date ranges of PENDING and APPROVED requests for the given trainer.
 * Used by the DateRangePicker to gray out non-selectable dates.
 */
export async function getBlockedDateRanges(trainerId: string): Promise<BlockedRange[]> {
  const requests = await prisma.vacationRequest.findMany({
    where: { trainerId, status: { in: ["PENDING", "APPROVED"] } },
    select: { startDate: true, endDate: true },
  })
  return requests
}

/**
 * Returns true if [startDate, endDate] overlaps any PENDING or APPROVED request for the trainer.
 * Overlap condition: start <= existingEnd AND end >= existingStart
 */
export async function checkOverlap(
  trainerId: string,
  startDate: Date,
  endDate: Date,
): Promise<boolean> {
  const conflict = await prisma.vacationRequest.findFirst({
    where: {
      trainerId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  })
  return conflict !== null
}

/**
 * Returns the trainer's current DRAFT request, if any.
 */
export async function getDraft(
  trainerId: string,
): Promise<{ id: string; startDate: Date; endDate: Date; daysCount: number } | null> {
  return prisma.vacationRequest.findFirst({
    where: { trainerId, status: "DRAFT" },
    select: { id: true, startDate: true, endDate: true, daysCount: true },
  })
}

/**
 * Creates a new PENDING vacation request after state machine and overlap checks.
 */
export async function submitRequest(
  trainerId: string,
  startDate: Date,
  endDate: Date,
  daysCount: number,
): Promise<ActionResult<{ id: string }>> {
  if (!canTransition("DRAFT", "PENDING", "TRAINER")) {
    return { success: false, error: "Invalid transition", code: ERRORS.INVALID_TRANSITION }
  }

  const overlap = await checkOverlap(trainerId, startDate, endDate)
  if (overlap) {
    return { success: false, error: "Date overlap conflict", code: ERRORS.OVERLAP_CONFLICT }
  }

  const req = await prisma.vacationRequest.create({
    data: { trainerId, startDate, endDate, daysCount, status: "PENDING" },
  })

  await auditService.log(trainerId, "REQUEST_SUBMITTED", "VacationRequest", req.id, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    daysCount,
  })

  return { success: true, data: { id: req.id } }
}

/**
 * Saves or updates a DRAFT vacation request. Only one DRAFT per trainer is allowed.
 */
export async function saveDraft(
  trainerId: string,
  startDate: Date,
  endDate: Date,
  daysCount: number,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.vacationRequest.findFirst({
    where: { trainerId, status: "DRAFT" },
    select: { id: true },
  })

  let reqId: string
  if (existing) {
    await prisma.vacationRequest.update({
      where: { id: existing.id },
      data: { startDate, endDate, daysCount },
    })
    reqId = existing.id
  } else {
    const req = await prisma.vacationRequest.create({
      data: { trainerId, startDate, endDate, daysCount, status: "DRAFT" },
    })
    reqId = req.id
  }

  await auditService.log(trainerId, "DRAFT_SAVED", "VacationRequest", reqId, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    daysCount,
  })

  return { success: true, data: { id: reqId } }
}

/**
 * Deletes a DRAFT request. Enforces ownership and DRAFT-only constraint.
 */
export async function deleteDraft(
  trainerId: string,
  draftId: string,
): Promise<ActionResult<void>> {
  const draft = await prisma.vacationRequest.findFirst({
    where: { id: draftId, trainerId, status: "DRAFT" },
    select: { id: true },
  })
  if (!draft) {
    return { success: false, error: "Draft not found", code: ERRORS.NOT_FOUND }
  }
  await prisma.vacationRequest.delete({ where: { id: draftId } })
  return { success: true, data: undefined }
}

/**
 * Cancels a PENDING or APPROVED request. Enforces ownership and state machine.
 */
export async function cancelRequest(
  trainerId: string,
  requestId: string,
): Promise<ActionResult<void>> {
  const request = await prisma.vacationRequest.findFirst({
    where: { id: requestId, trainerId },
    select: { id: true, status: true },
  })
  if (!request) {
    return { success: false, error: "Request not found", code: ERRORS.NOT_FOUND }
  }

  const currentStatus = request.status as RequestStatus
  if (!canTransition(currentStatus, "CANCELLED", "TRAINER")) {
    return { success: false, error: "Invalid transition", code: ERRORS.INVALID_TRANSITION }
  }

  await prisma.vacationRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  })

  await auditService.log(trainerId, "REQUEST_CANCELLED", "VacationRequest", requestId, {
    previousStatus: currentStatus,
  })

  return { success: true, data: undefined }
}
