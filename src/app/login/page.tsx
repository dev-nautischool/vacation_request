import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import LoginForm from "./LoginForm"

interface Props {
  searchParams: Promise<{ returnTo?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) {
    redirect("/dashboard")
  }

  const { returnTo } = await searchParams
  const safeReturnTo =
    returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : ""

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-8 border border-gray-200">
        <h1 className="text-xl font-bold mb-6">Morges Natation — Sign in</h1>
        <LoginForm returnTo={safeReturnTo} />
      </div>
    </main>
  )
}
