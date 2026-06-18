"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { setEntitlement } from "@/lib/actions/entitlements"
import type { EntitlementStatus } from "@/lib/services/entitlement.service"

interface EntitlementFormProps {
  trainerId: string
  year: number
  status: EntitlementStatus
}

export function EntitlementForm({ trainerId, year, status }: EntitlementFormProps) {
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(setEntitlement, null)

  if (state?.success) {
    toast("Entitlement saved.", "success")
  } else if (state && !state.success) {
    const message =
      state.code === "ENTITLEMENT_LOCKED"
        ? "Entitlement locked after 10-day edit window"
        : state.error
    toast(message, "error")
  }

  if (status.isLocked) {
    return (
      <div className="border border-[var(--color-border)] p-4 flex items-center gap-3">
        <span className="font-bold text-[var(--color-text-primary)] text-xl">{status.days}</span>
        <span className="text-[var(--color-text-body)] text-sm">days</span>
        <span
          title="Entitlement locked after 10-day edit window"
          className="ml-auto font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-body)] border border-[var(--color-border)] px-2 py-1 cursor-help"
        >
          Locked
        </span>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex items-end gap-4">
      <input type="hidden" name="trainerId" value={trainerId} />
      <input type="hidden" name="year" value={year} />
      <div className="flex-1">
        <label
          htmlFor="entitlement-days"
          className="block font-[var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-2"
        >
          Days
        </label>
        <input
          id="entitlement-days"
          name="days"
          type="number"
          min="1"
          max="365"
          defaultValue={status.days ?? ""}
          placeholder="e.g. 25"
          className="w-full border border-[var(--color-border)] px-3 h-[50px] font-[var(--font-body)] text-[14px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
