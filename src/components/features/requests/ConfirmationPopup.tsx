"use client"

import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/date"

interface ConfirmationPopupProps {
  startDate: Date
  endDate: Date
  daysCount: number
  remainingAfter: number
  supervisorName: string
  isPending: boolean
  onConfirm: () => void
  onBack: () => void
}

export function ConfirmationPopup({
  startDate,
  endDate,
  daysCount,
  remainingAfter,
  supervisorName,
  isPending,
  onConfirm,
  onBack,
}: ConfirmationPopupProps) {
  return (
    <div className="border border-[var(--color-border)] p-8 max-w-lg mx-auto">
      <h2 className="font-[var(--font-heading)] text-[24px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-6">
        Confirm Request
      </h2>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
          <span className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
            From
          </span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {formatDate(startDate)}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
          <span className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
            To
          </span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {formatDate(endDate)}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
          <span className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
            Days
          </span>
          <span className="text-[var(--color-text-primary)] font-bold text-lg">{daysCount}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
            Balance after approval
          </span>
          <span
            className={
              remainingAfter < 0
                ? "text-[var(--color-status-rejected)] font-bold text-lg"
                : "text-[var(--color-text-primary)] font-bold text-lg"
            }
          >
            {remainingAfter} days
          </span>
        </div>
        {remainingAfter < 0 && (
          <p className="text-sm text-[var(--color-status-rejected)]">
            Warning: this request exceeds your remaining balance.
          </p>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-body)] mb-6">
        Your request will be sent to{" "}
        <span className="font-medium text-[var(--color-text-primary)]">{supervisorName}</span> for
        review.
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" type="button" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button variant="primary" type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Submitting…" : "Confirm & Submit"}
        </Button>
      </div>
    </div>
  )
}
