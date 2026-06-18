import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getDraft } from "@/lib/services/request.service"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { DraftCard } from "@/components/features/requests/DraftCard"
import { Button } from "@/components/ui/Button"

export default async function DashboardPage() {
  const session = await getSession()
  const userId = session!.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  const isTrainer = user?.role === "TRAINER"

  const [draft, balance] = isTrainer
    ? await Promise.all([getDraft(userId), computeBalance(userId, new Date().getFullYear())])
    : [null, null]

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Dashboard
      </h1>
      <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)] mb-8">
        Welcome, {session!.user.name}
      </p>

      {isTrainer && balance && (
        <div className="mb-8 border border-[var(--color-border)] p-6 max-w-sm">
          <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-3">
            Vacation Balance {new Date().getFullYear()}
          </p>
          <p className="text-[48px] font-bold text-[var(--color-text-primary)] leading-none mb-1">
            {balance.remaining}
          </p>
          <p className="text-sm text-[var(--color-text-body)]">days remaining</p>
          {balance.carryOver > 0 && !balance.carryOverExpired && (
            <p className="text-sm text-[var(--color-text-body)] mt-2">
              Includes {balance.carryOver} carry-over days
            </p>
          )}
        </div>
      )}

      {isTrainer && draft && (
        <div className="mb-8">
          <p className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-3">
            Saved Draft
          </p>
          <DraftCard
            draftId={draft.id}
            startDate={draft.startDate}
            endDate={draft.endDate}
            daysCount={draft.daysCount}
          />
        </div>
      )}

      {isTrainer && !draft && (
        <div>
          <Link href="/requests/new">
            <Button variant="primary">New Request</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
