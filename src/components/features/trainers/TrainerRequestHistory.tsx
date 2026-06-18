import { Badge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/date"

interface VacationRequest {
  id: string
  startDate: Date
  endDate: Date
  daysCount: number
  status: string
  reason: string | null
  createdAt: Date
}

interface TrainerRequestHistoryProps {
  requests: VacationRequest[]
}

export function TrainerRequestHistory({ requests }: TrainerRequestHistoryProps) {
  if (requests.length === 0) {
    return (
      <p className="font-[var(--font-body)] text-[var(--color-text-body)]">
        No requests yet for this trainer.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="sticky left-0 bg-[var(--color-surface)] z-10 text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Dates
            </th>
            <th className="text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Days
            </th>
            <th className="text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Status
            </th>
            <th className="text-left py-3 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Submitted
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <>
              <tr key={req.id} className="border-b border-[var(--color-border)]">
                <td className="sticky left-0 bg-[var(--color-surface)] z-10 py-4 pr-6 text-[var(--color-text-body)]">
                  {formatDate(req.startDate)} – {formatDate(req.endDate)}
                </td>
                <td className="py-4 pr-6 text-[var(--color-text-body)]">{req.daysCount}</td>
                <td className="py-4 pr-6">
                  <Badge status={req.status as Parameters<typeof Badge>[0]["status"]} />
                </td>
                <td className="py-4 text-[var(--color-text-body)]">{formatDate(req.createdAt)}</td>
              </tr>
              {(req.status === "REJECTED" || req.status === "REVOKED") && req.reason && (
                <tr key={`${req.id}-reason`} className="border-b border-[var(--color-border)]">
                  <td
                    colSpan={4}
                    className="text-[var(--color-text-body)] text-sm pb-3 pt-1 px-0"
                  >
                    Reason: {req.reason}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
