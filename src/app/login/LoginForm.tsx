"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/actions/auth"
import type { ActionResult } from "@/types"

interface Props {
  returnTo: string
}

type LoginResult = ActionResult<{ redirectTo: string }> | null

export default function LoginForm({ returnTo }: Props) {
  const router = useRouter()
  const redirected = useRef(false)
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(
    login as (state: LoginResult, formData: FormData) => Promise<LoginResult>,
    null,
  )

  useEffect(() => {
    if (state?.success && !redirected.current) {
      redirected.current = true
      router.push(state.data.redirectTo)
    }
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />

      {state && !state.success && (
        <p role="alert" className="text-red-600 text-sm">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}
