interface SkeletonProps {
  variant: "card" | "table-row"
  className?: string
  "data-testid"?: string
}

const PULSE = "animate-pulse bg-[var(--color-surface-gray-2)]"

export function Skeleton({ variant, className = "", "data-testid": testId }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div
        className={`${PULSE} h-40 w-full ${className}`}
        aria-hidden="true"
        data-testid={testId}
      />
    )
  }

  // table-row: three stacked line-height bars
  return (
    <div
      className={`flex flex-col gap-2 py-3 ${className}`}
      aria-hidden="true"
      data-testid={testId}
    >
      <div className={`${PULSE} h-4 w-full`} />
      <div className={`${PULSE} h-4 w-3/4`} />
    </div>
  )
}
