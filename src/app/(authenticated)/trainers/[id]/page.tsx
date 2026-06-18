import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getFallbackSupervisorIds } from "@/lib/services/fallback.service"
import { getEntitlementStatus } from "@/lib/services/entitlement.service"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { BalanceCard } from "@/components/features/balance/BalanceCard"
import { EntitlementForm } from "@/components/features/trainers/EntitlementForm"
import { TrainerRequestHistory } from "@/components/features/trainers/TrainerRequestHistory"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TrainerDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "SUPERVISOR") redirect("/dashboard")

  const trainer = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, name: true, supervisorId: true, role: true },
  })
  if (!trainer || trainer.role !== "TRAINER") notFound()

  // Verify actor has scope over this trainer
  if (trainer.supervisorId !== actor.id) {
    const fallbackIds = await getFallbackSupervisorIds(actor.id)
    if (!fallbackIds.includes(trainer.supervisorId!)) notFound()
  }

  const year = new Date().getFullYear()
  const [balance, entitlementStatus, requests] = await Promise.all([
    computeBalance(trainer.id, year),
    getEntitlementStatus(trainer.id, year),
    prisma.vacationRequest.findMany({
      where: { trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        daysCount: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    }),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a
          href="/trainers"
          className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] hover:text-[var(--color-primary)]"
        >
          ← Back to Trainers
        </a>
      </div>

      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        {trainer.name}
      </h1>

      <div className="mb-8">
        <BalanceCard balance={balance} trainerName={trainer.name} />
      </div>

      <div className="mb-8">
        <h2 className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-4">
          Entitlement {year}
        </h2>
        <EntitlementForm trainerId={trainer.id} year={year} status={entitlementStatus} />
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-4">
          Request History
        </h2>
        <TrainerRequestHistory requests={requests} />
      </div>
    </div>
  )
}
