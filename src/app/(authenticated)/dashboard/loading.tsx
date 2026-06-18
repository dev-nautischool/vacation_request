import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div>
      <div className="h-10 w-48 bg-[var(--color-surface-gray-2)] animate-pulse mb-8" />
      <div className="h-4 w-40 bg-[var(--color-surface-gray-2)] animate-pulse mb-8" />
      <Skeleton variant="card" className="h-40 mb-8 max-w-sm" />
    </div>
  )
}
