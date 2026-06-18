import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div>
      <div className="h-10 w-48 bg-[var(--color-border)] animate-pulse mb-8" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="table-row" />
        ))}
      </div>
    </div>
  )
}
