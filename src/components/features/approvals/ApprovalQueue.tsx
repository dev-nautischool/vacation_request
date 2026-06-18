"use client"

import Link from "next/link"
import { formatDate } from "@/lib/date"

interface Trainer {
  id: string
  name: string
}

interface VacationRequest {
  id: string
  startDate: Date
  endDate: Date
  daysCount: number
  status: string
  createdAt: Date
}

type RequestWithTrainer = VacationRequest & { trainer: Trainer }

interface ApprovalQueueProps {
  requests: RequestWithTrainer[]
}

export function ApprovalQueue({ requests }: ApprovalQueueProps) {
  if (requests.length === 0) {
    return (
      <p className="font-[var(--font-body)] text-[var(--color-text-body)]">
        No pending requests. Your trainers are all set.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="sticky left-0 bg-[var(--color-surface)] z-10 text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Trainer
            </th>
            <th className="text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Dates
            </th>
            <th className="text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Days
            </th>
            <th className="text-left py-3 pr-6 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Submitted
            </th>
            <th className="text-left py-3 font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="border-b border-[var(--color-border)]">
              <td className="sticky left-0 bg-[var(--color-surface)] z-10 py-4 pr-6 font-medium text-[var(--color-text-primary)]">
                {req.trainer.name}
              </td>
              <td className="py-4 pr-6 text-[var(--color-text-body)]">
                {formatDate(req.startDate)} – {formatDate(req.endDate)}
              </td>
              <td className="py-4 pr-6 text-[var(--color-text-body)]">{req.daysCount}</td>
              <td className="py-4 pr-6 text-[var(--color-text-body)]">{formatDate(req.createdAt)}</td>
              <td className="py-4">
                <Link
                  href={`/approvals/${req.id}`}
                  className="inline-flex items-center justify-center px-[22px] py-[13px] font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] transition-colors duration-150 bg-transparent text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
