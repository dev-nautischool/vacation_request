"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button, useToast } from "@/components/ui"
import { configureFallback } from "@/lib/actions/users"
import type { ActionResult } from "@/types"
import type { FallbackApprover } from "@/generated/prisma/client"

interface FallbackOption {
  id: string
  name: string
}

interface FallbackInfo {
  id: string
  fallbackUserId: string
  fallbackUser: { id: string; name: string }
  expiresAt: Date
}

interface FallbackConfigProps {
  currentFallback: FallbackInfo | null
  supervisors: FallbackOption[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving…" : "Configure Fallback"}
    </Button>
  )
}

export function FallbackConfig({ currentFallback, supervisors }: FallbackConfigProps) {
  const [state, action] = useActionState<ActionResult<FallbackApprover> | null, FormData>(
    configureFallback,
    null,
  )
  const { toast } = useToast()

  useEffect(() => {
    if (!state) return
    if (state.success) toast("Fallback approver configured.", "success")
    else toast(state.error, "error")
  }, [state, toast])

  const now = new Date()
  const isActive = currentFallback && new Date(currentFallback.expiresAt) > now

  return (
    <section className="border border-[var(--color-border)] p-6">
      <h2 className="font-[var(--font-heading)] text-[20px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-4">
        Fallback Approver
      </h2>

      {currentFallback && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)]">
            {currentFallback.fallbackUser.name}
          </span>
          <span className="font-[var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
            Expires {new Date(currentFallback.expiresAt).toLocaleDateString("en-CH")}
          </span>
          {isActive ? (
            <span className="border-2 border-[var(--color-status-approved)] text-[var(--color-status-approved)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]">
              Active
            </span>
          ) : (
            <span className="border-2 border-[var(--color-status-rejected)] text-[var(--color-status-rejected)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]">
              Expired
            </span>
          )}
        </div>
      )}

      {supervisors.length === 0 ? (
        <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-secondary)] italic">
          No other supervisors available to configure as fallback.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1">
            <label className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Fallback Supervisor
            </label>
            <select
              name="fallbackUserId"
              defaultValue={currentFallback?.fallbackUserId ?? ""}
              className="h-9 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-[var(--font-body)] text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="" disabled>
                Select supervisor
              </option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiresAt"
              className="h-9 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-[var(--font-body)] text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            {state && !state.success && state.error.toLowerCase().includes("expiry") && (
              <p className="font-[var(--font-body)] text-[12px] text-[var(--color-status-rejected)]">
                {state.error}
              </p>
            )}
          </div>

          <SubmitButton />
        </form>
      )}
    </section>
  )
}
