import type { BalanceSnapshot } from "@/lib/services/vacation-balance.service"

interface BalanceBarProps {
  balance: BalanceSnapshot
}

export function BalanceBar({ balance }: BalanceBarProps) {
  const total = balance.freshEntitlement + balance.carryOver
  const takenPct = total > 0 ? Math.min((balance.taken / total) * 100, 100) : 0
  const pendingPct = total > 0 ? Math.min((balance.pending / total) * 100, 100 - takenPct) : 0

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
          Balance {new Date().getFullYear()}
        </span>
        <span className="text-sm text-[var(--color-text-body)]">
          {total} days total
        </span>
      </div>

      <div className="h-3 w-full bg-[var(--color-surface-gray-2)] overflow-hidden flex">
        <div
          className="h-full bg-[var(--color-status-approved)]"
          style={{ width: `${takenPct}%` }}
          aria-label={`${balance.taken} days taken`}
        />
        <div
          className="h-full bg-[var(--color-status-pending)] opacity-70"
          style={{ width: `${pendingPct}%` }}
          aria-label={`${balance.pending} days pending`}
        />
      </div>

      <div className="flex gap-4 mt-2 flex-wrap">
        <LegendDot color="var(--color-status-approved)" label={`${balance.taken} taken`} />
        <LegendDot color="var(--color-status-pending)" label={`${balance.pending} pending`} />
        <LegendDot color="var(--color-surface-gray-2)" label={`${balance.remaining} remaining`} />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-[var(--color-text-body)]">{label}</span>
    </div>
  )
}
