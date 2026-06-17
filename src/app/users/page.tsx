import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { UserForm } from "@/components/features/users/UserForm"
import { UserList } from "@/components/features/users/UserList"
import { FallbackConfig } from "@/components/features/users/FallbackConfig"

export default async function UsersPage() {
  const session = await getSession()
  const currentUserId = session!.user.id

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      supervisorId: true,
      supervisor: {
        select: { id: true, name: true },
      },
    },
  })

  const supervisors = users
    .filter((u) => u.role === "SUPERVISOR")
    .map((u) => ({ id: u.id, name: u.name }))

  const otherSupervisors = supervisors.filter((s) => s.id !== currentUserId)

  const activeFallback = await prisma.fallbackApprover.findFirst({
    where: { supervisorId: currentUserId, active: true },
    select: {
      id: true,
      fallbackUserId: true,
      expiresAt: true,
      fallbackUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Users
      </h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <UserForm />
        <UserList users={users} supervisors={supervisors} />
      </div>
      <div className="mt-8">
        <FallbackConfig currentFallback={activeFallback} supervisors={otherSupervisors} />
      </div>
    </div>
  )
}
