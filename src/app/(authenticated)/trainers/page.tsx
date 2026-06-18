import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { TrainerList } from "@/components/features/trainers/TrainerList"

export default async function TrainersPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "SUPERVISOR") redirect("/dashboard")

  const trainers = await prisma.user.findMany({
    where: { supervisorId: actor.id, deletedAt: null, role: "TRAINER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const year = new Date().getFullYear()
  const trainerSummaries = await Promise.all(
    trainers.map(async (t) => {
      const [balance, pendingCount] = await Promise.all([
        computeBalance(t.id, year),
        prisma.vacationRequest.count({ where: { trainerId: t.id, status: "PENDING" } }),
      ])
      return { id: t.id, name: t.name, balance, pendingCount }
    }),
  )

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Trainers
      </h1>
      <TrainerList trainers={trainerSummaries} />
    </div>
  )
}
