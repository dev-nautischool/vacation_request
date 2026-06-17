import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { ToastProvider } from "@/components/ui/Toast"
import { NavBar } from "@/components/layout/NavBar"
import { PageShell } from "@/components/layout/PageShell"
import { getNavItems } from "@/components/layout/nav-items"

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, deletedAt: true },
  })

  if (!user || user.deletedAt) {
    redirect("/login")
  }

  const navItems = getNavItems(user.role)

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar navItems={navItems} userName={session.user.name} />
        <PageShell>{children}</PageShell>
      </div>
    </ToastProvider>
  )
}
