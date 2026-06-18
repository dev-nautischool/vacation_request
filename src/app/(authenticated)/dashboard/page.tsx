import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getDraft } from "@/lib/services/request.service"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { DraftCard } from "@/components/features/requests/DraftCard"
import { Button } from "@/components/ui/Button"
import { TrainerList } from "@/components/features/trainers/TrainerList"
import { formatDate } from "@/lib/date"

export default async function DashboardPage() {
  const session = await getSession()
  const userId = session!.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  const isTrainer = user?.role === "TRAINER"
  const isSupervisor = user?.role === "SUPERVISOR"
  const year = new Date().getFullYear()

  const [draft, balance] = isTrainer
    ? await Promise.all([getDraft(userId), computeBalance(userId, year)])
    : [null, null]

  // Supervisor data
  let trainerSummaries: { id: string; name: string; balance: Awaited<ReturnType<typeof computeBalance>>; pendingCount: number }[] = []
  let pendingPreview: { id: string; startDate: Date; endDate: Date; daysCount: number; trainer: { name: string } }[] = []

  if (isSupervisor) {
    const trainers = await prisma.user.findMany({
      where: { supervisorId: userId, deletedAt: null, role: "TRAINER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    trainerSummaries = await Promise.all(
      trainers.map(async (t) => {
        const [bal, pendingCount] = await Promise.all([
          computeBalance(t.id, year),
          prisma.vacationRequest.count({ where: { trainerId: t.id, status: "PENDING" } }),
        ])
        return { id: t.id, name: t.name, balance: bal, pendingCount }
      }),
    )

    pendingPreview = await prisma.vacationRequest.findMany({
      where: { trainer: { supervisorId: userId, deletedAt: null }, status: "PENDING" },
      include: { trainer: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 3,
    })
  }

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Dashboard
      </h1>
      <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)] mb-8">
        Welcome, {session!.user.name}
      </p>

      {/* ── Trainer view ─────────────────────────────────────────────────── */}
      {isTrainer && balance && (
        <div className="mb-8 border border-[var(--color-border)] p-6 max-w-sm">
          <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-3">
            Vacation Balance {year}
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

      {/* ── Supervisor view ───────────────────────────────────────────────── */}
      {isSupervisor && (
        <>
          {/* Pending queue preview */}
          {pendingPreview.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
                  Pending Requests
                </h2>
                <Link
                  href="/approvals"
                  className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)] hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {pendingPreview.map((req) => (
                  <Link
                    key={req.id}
                    href={`/approvals/${req.id}`}
                    className="flex items-center justify-between border border-[var(--color-border)] px-4 py-3 hover:border-[var(--color-primary)] transition-colors"
                  >
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {req.trainer.name}
                    </span>
                    <span className="text-[var(--color-text-body)] text-sm">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)} ({req.daysCount} days)
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trainer summary grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)]">
                My Trainers
              </h2>
              <Link
                href="/trainers"
                className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)] hover:underline"
              >
                View all
              </Link>
            </div>
            <TrainerList trainers={trainerSummaries} />
          </div>
        </>
      )}
    </div>
  )
}
