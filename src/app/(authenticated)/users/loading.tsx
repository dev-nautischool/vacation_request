import { Skeleton } from "@/components/ui"

export default function UsersLoading() {
  return (
    <div>
      <div className="animate-pulse bg-[var(--color-surface-gray-2)] h-10 w-32 mb-8" aria-hidden="true" />
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <Skeleton variant="card" />
        <div className="border border-[var(--color-border)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="table-row" className="px-4 border-b border-[var(--color-border)] last:border-b-0" />
          ))}
        </div>
      </div>
    </div>
  )
}
