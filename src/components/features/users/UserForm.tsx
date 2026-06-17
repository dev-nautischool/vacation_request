"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useEffect } from "react"
import { Button, Input, useToast } from "@/components/ui"
import { createUser } from "@/lib/actions/users"
import type { ActionResult } from "@/types"
import type { User } from "@/generated/prisma/client"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Creating..." : "Create User"}
    </Button>
  )
}

export function UserForm() {
  const [state, action] = useActionState<ActionResult<User> | null, FormData>(createUser, null)
  const { toast } = useToast()

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast("User created successfully.", "success")
    } else if (!state.fields) {
      toast(state.error, "error")
    }
  }, [state, toast])

  return (
    <form action={action} className="border border-[var(--color-border)] p-6">
      <h2 className="font-[var(--font-heading)] text-[18px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-6">
        Create User
      </h2>

      <div className="grid gap-4 mb-6">
        <div>
          <Input
            id="user-name"
            label="Full Name"
            name="name"
            type="text"
            required
            error={state?.success === false ? state.fields?.name : undefined}
          />
        </div>
        <div>
          <Input
            id="user-email"
            label="Email Address"
            name="email"
            type="email"
            required
            error={state?.success === false ? state.fields?.email : undefined}
          />
        </div>
        <div>
          <Input
            id="user-password"
            label="Initial Password"
            name="password"
            type="password"
            required
            error={state?.success === false ? state.fields?.password : undefined}
          />
        </div>
        <div>
          <label
            htmlFor="role"
            className="block font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-1"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="TRAINER"
            className="w-full h-[50px] border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-[var(--font-body)] text-[14px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="TRAINER">Trainer</option>
            <option value="SUPERVISOR">Supervisor</option>
          </select>
        </div>
      </div>

      {state?.success === false && !state.fields && (
        <p role="alert" className="text-[var(--color-status-rejected)] text-[13px] mb-4">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
