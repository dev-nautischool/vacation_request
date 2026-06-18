import Link from "next/link"
import { BalanceBar } from "@/components/features/balance/BalanceBar"
import type { BalanceSnapshot } from "@/lib/services/vacation-balance.service"

interface TrainerSummaryCardProps {
  trainerId: string
  trainerName: string
  balance: BalanceSnapshot
  pendingCount: number
}

export function TrainerSummaryCard({
  trainerId,
  trainerName,
  balance,
  pendingCount,
}: TrainerSummaryCardProps) {
  const initial = trainerName.charAt(0).toUpperCase()

  return (
    <Link
      href={`/trainers/${trainerId}`}
      className="block border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)] transition-colors duration-150"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text-primary)] truncate">{trainerName}</p>
        </div>
        {pendingCount > 0 && (
          <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-status-rejected)] text-white text-[11px] font-bold flex items-center justify-center rounded-full">
            {pendingCount}
          </span>
        )}
      </div>
      <BalanceBar balance={balance} />
    </Link>
  )
}
