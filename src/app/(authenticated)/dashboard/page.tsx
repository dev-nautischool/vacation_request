import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Dashboard
      </h1>
      <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)]">
        Welcome, {session?.user.name}
      </p>
    </div>
  )
}
