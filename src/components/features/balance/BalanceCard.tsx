import type { BalanceSnapshot } from "@/lib/services/vacation-balance.service"
import { BalanceBar } from "./BalanceBar"

interface BalanceCardProps {
  balance: BalanceSnapshot
  trainerName: string
}

export function BalanceCard({ balance, trainerName }: BalanceCardProps) {
  return (
    <div className="border border-[var(--color-border)] p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-1">
            Trainer
          </p>
          <p className="font-medium text-[var(--color-text-primary)]">{trainerName}</p>
        </div>
        <div className="text-right">
          <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-1">
            Remaining
          </p>
          <p
            className={
              balance.remaining < 0
                ? "text-[32px] font-bold text-[var(--color-status-rejected)] leading-none"
                : "text-[32px] font-bold text-[var(--color-text-primary)] leading-none"
            }
          >
            {balance.remaining}
          </p>
        </div>
      </div>
      <BalanceBar balance={balance} />
    </div>
  )
}
