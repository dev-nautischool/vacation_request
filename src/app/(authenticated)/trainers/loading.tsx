import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div className="max-w-2xl">
      <div className="h-10 w-48 bg-[var(--color-border)] animate-pulse mb-8" />
      <Skeleton variant="card" className="mb-8" />
      <Skeleton variant="card" />
    </div>
  )
}
