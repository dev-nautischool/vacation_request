import { TrainerSummaryCard } from "@/components/features/trainers/TrainerSummaryCard"
import type { BalanceSnapshot } from "@/lib/services/vacation-balance.service"

export interface TrainerSummaryData {
  id: string
  name: string
  balance: BalanceSnapshot
  pendingCount: number
}

interface TrainerListProps {
  trainers: TrainerSummaryData[]
}

export function TrainerList({ trainers }: TrainerListProps) {
  if (trainers.length === 0) {
    return (
      <p className="font-[var(--font-body)] text-[var(--color-text-body)]">
        No trainers assigned.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trainers.map((t) => (
        <TrainerSummaryCard
          key={t.id}
          trainerId={t.id}
          trainerName={t.name}
          balance={t.balance}
          pendingCount={t.pendingCount}
        />
      ))}
    </div>
  )
}
