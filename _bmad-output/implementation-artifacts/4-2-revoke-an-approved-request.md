---
story_key: 4-2-revoke-an-approved-request
epic: 4
story: 2
baseline_commit: cfc63e91c88d616fc953358aa46816ea50b8d2eb
---

# Story 4.2: Revoke an Approved Request

Status: done

## Story

As a supervisor,
I want to revoke a previously approved vacation request,
So that I can correct an approval that was granted in error or is no longer viable.

## Acceptance Criteria

1. **Given** a supervisor views an APPROVED request at `/approvals/:id`
   **When** the page loads
   **Then** a "Revoke Approval" button is visible with secondary/destructive styling

2. **Given** a supervisor clicks "Revoke Approval"
   **When** the confirmation modal appears
   **Then** it reads "Are you sure? This will revoke the approval. A reason is required." with a reason textarea and Confirm/Cancel actions

3. **Given** the supervisor enters a reason and confirms
   **When** the `revokeRequest` Server Action runs
   **Then** `canTransition(APPROVED, REVOKED, "SUPERVISOR")` is called first
   **And** the request status is updated to REVOKED with the reason stored
   **And** an audit log entry is written
   **And** a toast confirms: "Approval revoked."
   **And** the supervisor is redirected to `/approvals`

4. **Given** a supervisor attempts to revoke without entering a reason
   **When** they click Confirm
   **Then** the modal shows a validation error: "A reason is required" and does not submit

5. **Given** a fallback approver views an APPROVED request
   **When** the page loads
   **Then** no "Revoke Approval" button is shown (fallback approvers cannot revoke)

## Tasks / Subtasks

- [x] Task 1: Add `revokeRequest` to `src/lib/services/approval.service.ts` (AC: 3, 4, 5)
  - [x] `revokeRequest(actorId, requestId, reason)`: load request, verify actor is SUPERVISOR (not FALLBACK) for this trainer, `canTransition(APPROVED, REVOKED, "SUPERVISOR")`, validate reason non-empty, update status + reason, `auditService.log`
  - [x] Returns `UNAUTHORIZED` if actorRole resolves to FALLBACK

- [x] Task 2: Add `revokeRequest` to `src/lib/actions/approvals.ts` (AC: 3)
  - [x] Extract `requestId` and `reason` from formData
  - [x] Verify SUPERVISOR session; call service
  - [x] `revalidatePath("/approvals")` + `redirect("/approvals")` on success

- [x] Task 3: `actorRole` already passed to `<ApprovalDetail>` from Story 4-1 (AC: 1, 5)

- [x] Task 4: Update `src/components/features/approvals/ApprovalDetail.tsx` — add Revoke button and modal (AC: 1, 2, 4, 5)
  - [x] Show "Revoke Approval" button only when `request.status === "APPROVED" && actorRole === "SUPERVISOR"`
  - [x] Clicking opens `<RevokeModal>` controlled by local `showRevokeModal` state

- [x] Task 5: Create `src/components/features/approvals/RevokeModal.tsx` (AC: 2, 4)
  - [x] Props: `requestId`, `onClose`
  - [x] Modal title: "Revoke Approval"
  - [x] Body text: "Are you sure? This will revoke the approval. A reason is required."
  - [x] Controlled textarea for reason; "Confirm" button disabled when `reason.trim() === ""`
  - [x] Validation: shows inline error "A reason is required" before submitting
  - [x] On submit: calls `revokeRequest` action; shows toast on error; calls `onClose`

- [x] Task 6: `revokeRequest` tests already in `src/lib/services/approval.service.test.ts` (AC: 3, 4, 5)
  - [x] Success path: APPROVED → REVOKED
  - [x] INVALID_TRANSITION when request is not APPROVED
  - [x] VALIDATION_ERROR when reason is empty
  - [x] UNAUTHORIZED when actorRole is FALLBACK

## Dev Notes

### Fallback approvers cannot revoke

The `revokeRequest` service must explicitly reject FALLBACK actors. The `resolveActorRole` helper from Story 4-1 returns `"FALLBACK"` for those; check before proceeding:

```ts
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
  await auditService.log(actorId, "REQUEST_REVOKED", "VacationRequest", requestId, { reason })
  return { success: true, data: undefined }
}
```

### Balance recalculation

No explicit recalculation is needed. `computeBalance` is called dynamically from records. Once the request is REVOKED, it is excluded from balance calculations automatically (only PENDING and APPROVED requests count toward consumed days).

### Using the existing Modal component

```tsx
import { Modal } from "@/components/ui/Modal"

<Modal open={showRevokeModal} onClose={() => setShowRevokeModal(false)} title="Revoke Approval">
  {/* textarea + confirm/cancel buttons */}
</Modal>
```

### References

- [Source: epics.md#Story 4.2] — acceptance criteria
- [Source: architecture.md#State Machine Enforcement] — REVOKED transition
- [Source: story 4-1] — `resolveActorRole`, approval.service.ts, ApprovalDetail pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- src/lib/services/approval.service.ts (modified — revokeRequest already included)
- src/lib/actions/approvals.ts (modified — revokeRequest already included)
- src/components/features/approvals/ApprovalDetail.tsx (modified — Revoke button + RevokeModal wiring)
- src/components/features/approvals/RevokeModal.tsx (new)

### Change Log

- 2026-06-18: Implemented Story 4.2 — revokeRequest service + action (included in 4-1 files), RevokeModal component, Revoke button in ApprovalDetail (SUPERVISOR-only, hidden for FALLBACK); 209 tests pass
