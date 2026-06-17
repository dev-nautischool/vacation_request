import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { logout } from "@/lib/actions/auth"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>
      <p className="mb-6 text-gray-700">Welcome, {session.user.name}</p>
      <form action={logout}>
        <button
          type="submit"
          className="border border-gray-300 px-4 py-2 text-sm"
        >
          Sign out
        </button>
      </form>
    </main>
  )
}
