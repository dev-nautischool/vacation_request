import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getFallbackSupervisorIds } from "@/lib/services/fallback.service"
import { ApprovalQueue } from "@/components/features/approvals/ApprovalQueue"

export default async function ApprovalsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "SUPERVISOR") redirect("/dashboard")

  // Collect trainer IDs in scope: own trainers + fallback-covered trainers
  const [ownTrainers, fallbackSupervisorIds] = await Promise.all([
    prisma.user.findMany({
      where: { supervisorId: actor.id, deletedAt: null, role: "TRAINER" },
      select: { id: true },
    }),
    getFallbackSupervisorIds(actor.id),
  ])

  const coveredTrainers =
    fallbackSupervisorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            supervisorId: { in: fallbackSupervisorIds },
            deletedAt: null,
            role: "TRAINER",
          },
          select: { id: true },
        })
      : []

  const allTrainerIds = [...ownTrainers, ...coveredTrainers].map((t) => t.id)

  const requests =
    allTrainerIds.length > 0
      ? await prisma.vacationRequest.findMany({
          where: { trainerId: { in: allTrainerIds }, status: "PENDING" },
          include: { trainer: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : []

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Approvals
      </h1>
      <ApprovalQueue requests={requests} />
    </div>
  )
}
