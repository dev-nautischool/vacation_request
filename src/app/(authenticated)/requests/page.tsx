import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { RequestHistory } from "@/components/features/requests/RequestHistory"

export default async function RequestsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })
  if (!user || user.role !== "TRAINER") redirect("/dashboard")

  const requests = await prisma.vacationRequest.findMany({
    where: { trainerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      daysCount: true,
      status: true,
      createdAt: true,
    },
  })

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        My Requests
      </h1>
      <RequestHistory requests={requests} />
    </div>
  )
}
