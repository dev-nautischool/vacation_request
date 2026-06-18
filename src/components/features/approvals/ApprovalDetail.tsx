"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { formatDate } from "@/lib/date"
import { approveRequest, rejectRequest } from "@/lib/actions/approvals"
import { RevokeModal } from "@/components/features/approvals/RevokeModal"
import type { ActorRole } from "@/lib/request-state-machine"

interface VacationRequest {
  id: string
  startDate: Date
  endDate: Date
  daysCount: number
  status: string
  reason: string | null
}

interface ApprovalDetailProps {
  request: VacationRequest
  trainerName: string
  currentRemaining: number
  projectedRemaining: number
  actorRole: ActorRole
}

export function ApprovalDetail({
  request,
  trainerName,
  currentRemaining,
  projectedRemaining,
  actorRole,
}: ApprovalDetailProps) {
  const { toast } = useToast()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reason, setReason] = useState("")

  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [approveState, approveAction, approvePending] = useActionState(approveRequest, null)
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectRequest, null)

  // Show error toasts from action results
  if (approveState && !approveState.success) {
    toast(approveState.error, "error")
  }
  if (rejectState && !rejectState.success) {
    toast(rejectState.error, "error")
  }

  const avatarInitial = trainerName.charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a
          href="/approvals"
          className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] hover:text-[var(--color-primary)]"
        >
          ← Back to Approvals
        </a>
      </div>

      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Vacation Request
      </h1>

      {/* Trainer info */}
      <div className="border border-[var(--color-border)] p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center font-bold text-xl flex-shrink-0">
            {avatarInitial}
          </div>
          <div>
            <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-0.5">
              Trainer
            </p>
            <p className="font-medium text-[var(--color-text-primary)]">{trainerName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-1">
              Dates
            </p>
            <p className="text-[var(--color-text-primary)]">
              {formatDate(request.startDate)} – {formatDate(request.endDate)}
            </p>
          </div>
          <div>
            <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-1">
              Days Requested
            </p>
            <p className="text-[var(--color-text-primary)]">{request.daysCount}</p>
          </div>
        </div>

        <div>
          <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-1">
            Balance Snapshot
          </p>
          <p className="text-[var(--color-text-body)]">
            Current:{" "}
            <span className="font-bold text-[var(--color-text-primary)]">{currentRemaining}</span>{" "}
            days → After approval:{" "}
            <span
              className={`font-bold ${projectedRemaining < 0 ? "text-[var(--color-status-rejected)]" : "text-[var(--color-text-primary)]"}`}
            >
              {projectedRemaining}
            </span>{" "}
            days
          </p>
        </div>
      </div>

      {/* Actions — only for PENDING requests */}
      {request.status === "PENDING" && !showRejectForm && (
        <div className="flex gap-4">
          <form action={approveAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <Button type="submit" variant="primary" disabled={approvePending}>
              {approvePending ? "Approving…" : "Approve"}
            </Button>
          </form>
          <Button
            variant="danger"
            onClick={() => setShowRejectForm(true)}
            disabled={approvePending}
          >
            Reject
          </Button>
        </div>
      )}
      {request.status === "PENDING" && showRejectForm && (
        <div className="border border-[var(--color-border)] p-6">
          <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-3">
            Rejection Reason
          </p>
          <form action={rejectAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <textarea
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Enter a reason for rejection…"
              className="w-full border border-[var(--color-border)] p-3 font-[var(--font-body)] text-[14px] text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-4"
            />
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="danger"
                disabled={reason.trim().length === 0 || rejectPending}
              >
                {rejectPending ? "Rejecting…" : "Confirm Rejection"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRejectForm(false)
                  setReason("")
                }}
                disabled={rejectPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Revoke button — only for APPROVED requests where actor is direct SUPERVISOR */}
      {request.status === "APPROVED" && actorRole === "SUPERVISOR" && (
        <div className="mt-6">
          <Button
            variant="danger"
            onClick={() => setShowRevokeModal(true)}
          >
            Revoke Approval
          </Button>
        </div>
      )}

      {showRevokeModal && (
        <RevokeModal
          requestId={request.id}
          onClose={() => setShowRevokeModal(false)}
        />
      )}
    </div>
  )
}
