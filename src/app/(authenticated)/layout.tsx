import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ToastProvider } from "@/components/ui/Toast"
import { NavBar } from "@/components/layout/NavBar"
import { PageShell } from "@/components/layout/PageShell"
import { getNavItems } from "@/components/layout/nav-items"

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  const navItems = getNavItems(user?.role ?? "TRAINER")

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar navItems={navItems} userName={session.user.name} />
        <PageShell>{children}</PageShell>
      </div>
    </ToastProvider>
  )
}
