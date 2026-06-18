import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div>
      <div className="h-10 w-48 bg-[var(--color-surface-gray-2)] animate-pulse mb-8" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  )
}
