import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { resolveActorRole } from "@/lib/services/approval.service"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { ApprovalDetail } from "@/components/features/approvals/ApprovalDetail"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ApprovalDetailPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt || actor.role !== "SUPERVISOR") redirect("/dashboard")

  const request = await prisma.vacationRequest.findUnique({
    where: { id },
    include: { trainer: { select: { id: true, name: true } } },
  })
  if (!request) notFound()

  const actorRole = await resolveActorRole(actor.id, request.trainerId)
  if (!actorRole) notFound()

  const year = request.startDate.getFullYear()
  const balance = await computeBalance(request.trainerId, year)
  const projectedRemaining = balance.remaining - request.daysCount

  return (
    <ApprovalDetail
      request={request}
      trainerName={request.trainer.name}
      currentRemaining={balance.remaining}
      projectedRemaining={projectedRemaining}
      actorRole={actorRole}
    />
  )
}
