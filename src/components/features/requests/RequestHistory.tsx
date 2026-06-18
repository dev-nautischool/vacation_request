"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { cancelRequest } from "@/lib/actions/requests"
import { formatDate } from "@/lib/date"

interface VacationRequest {
  id: string
  startDate: Date
  endDate: Date
  daysCount: number
  status: string
  createdAt: Date
}

interface RequestHistoryProps {
  requests: VacationRequest[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
}

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "text-[var(--color-text-body)]",
  PENDING: "text-[var(--color-status-pending)]",
  APPROVED: "text-[var(--color-status-approved)]",
  REJECTED: "text-[var(--color-status-rejected)]",
  CANCELLED: "text-[var(--color-text-muted)]",
  REVOKED: "text-[var(--color-text-muted)]",
}

const CANCELLABLE = new Set(["PENDING", "APPROVED"])

function RequestRow({ request }: { request: VacationRequest }) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("requestId", request.id)
      const result = await cancelRequest(null, formData)
      if (result.success) {
        toast("Request cancelled.", "success")
      } else {
        toast("Failed to cancel request.", "error")
      }
    })
  }

  return (
    <tr className="border-b border-[var(--color-border)] last:border-0">
      <td className="py-4 pr-4 text-[var(--color-text-primary)] font-medium">
        {formatDate(request.startDate)}
      </td>
      <td className="py-4 pr-4 text-[var(--color-text-primary)] font-medium">
        {formatDate(request.endDate)}
      </td>
      <td className="py-4 pr-4 text-[var(--color-text-body)]">
        {request.daysCount} {request.daysCount === 1 ? "day" : "days"}
      </td>
      <td className={`py-4 pr-4 font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] ${STATUS_CLASSES[request.status] ?? ""}`}>
        {STATUS_LABELS[request.status] ?? request.status}
      </td>
      <td className="py-4 text-right">
        {CANCELLABLE.has(request.status) && (
          <Button variant="outline" type="button" onClick={handleCancel} disabled={isPending}>
            {isPending ? "Cancelling…" : "Cancel"}
          </Button>
        )}
      </td>
    </tr>
  )
}

export function RequestHistory({ requests }: RequestHistoryProps) {
  if (requests.length === 0) {
    return (
      <p className="text-[var(--color-text-body)] text-sm py-8 text-center">
        No requests yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-[var(--color-border)]">
            {["From", "To", "Days", "Status", ""].map((h) => (
              <th
                key={h}
                className="pb-3 text-left font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
