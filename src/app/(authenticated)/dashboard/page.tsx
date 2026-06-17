import { getSession } from "@/lib/session"

export default async function DashboardPage() {
  const session = await getSession()

  return (
    <div>
      <h1 className="font-[var(--font-heading)] text-[36px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-8">
        Dashboard
      </h1>
      <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)]">
        Welcome, {session!.user.name}
      </p>
    </div>
  )
}
