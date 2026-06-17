export type RequestStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVOKED"

const statusStyles: Record<RequestStatus, string> = {
  DRAFT: "text-[var(--color-status-draft)] border-[var(--color-status-draft)]",
  PENDING: "text-[var(--color-status-pending)] border-[var(--color-status-pending)]",
  APPROVED: "text-[var(--color-status-approved)] border-[var(--color-status-approved)]",
  REJECTED: "text-[var(--color-status-rejected)] border-[var(--color-status-rejected)]",
  CANCELLED: "text-[var(--color-status-cancelled)] border-[var(--color-status-cancelled)]",
  REVOKED: "text-[var(--color-status-revoked)] border-[var(--color-status-revoked)]",
}

const BASE =
  "inline-block border-2 px-2 py-0.5 " +
  "font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.1em]"

interface BadgeProps {
  status: RequestStatus
  className?: string
}

export function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`${BASE} ${statusStyles[status]} ${className}`}
      data-status={status.toLowerCase()}
    >
      {status}
    </span>
  )
}
