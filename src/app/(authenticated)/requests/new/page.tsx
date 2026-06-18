import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { getBlockedDateRanges } from "@/lib/services/request.service"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { RequestForm } from "@/components/features/requests/RequestForm"

export default async function NewRequestPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, supervisorId: true },
  })
  if (!user || user.role !== "TRAINER") redirect("/dashboard")

  const supervisor = user.supervisorId
    ? await prisma.user.findUnique({
        where: { id: user.supervisorId },
        select: { name: true },
      })
    : null

  const [blockedRanges, balance] = await Promise.all([
    getBlockedDateRanges(user.id),
    computeBalance(user.id, new Date().getFullYear()),
  ])

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        New Request
      </h1>
      <RequestForm
        blockedRanges={blockedRanges}
        balance={balance}
        supervisorName={supervisor?.name ?? "your supervisor"}
      />
    </div>
  )
}
