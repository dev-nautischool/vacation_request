"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { DateRangePicker } from "./DateRangePicker"
import { ConfirmationPopup } from "./ConfirmationPopup"
import { useToast } from "@/components/ui/Toast"
import { submitRequest, saveDraft } from "@/lib/actions/requests"
import { ERRORS } from "@/lib/errors"
import type { BalanceSnapshot } from "@/lib/services/vacation-balance.service"

interface BlockedRange {
  startDate: Date
  endDate: Date
}

interface RequestFormProps {
  blockedRanges: BlockedRange[]
  balance: BalanceSnapshot
  supervisorName: string
}

type Step = "pick" | "confirm"

interface Selection {
  startDate: Date
  endDate: Date
  daysCount: number
}

export function RequestForm({ blockedRanges, balance, supervisorName }: RequestFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>("pick")
  const [selection, setSelection] = useState<Selection | null>(null)

  function handleSelect(start: Date, end: Date, daysCount: number) {
    // Client-side overlap check: verify against blockedRanges
    const hasOverlap = blockedRanges.some(
      (r) => start <= r.endDate && end >= r.startDate,
    )
    if (hasOverlap) {
      toast("These dates overlap an existing request. Choose different dates.", "error")
      return
    }
    setSelection({ startDate: start, endDate: end, daysCount })
    setStep("confirm")
  }

  function handleBack() {
    setStep("pick")
  }

  function handleConfirm() {
    if (!selection) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set("startDate", selection.startDate.toISOString())
      formData.set("endDate", selection.endDate.toISOString())
      formData.set("daysCount", String(selection.daysCount))

      const result = await submitRequest(null, formData)
      if (result.success) {
        toast(`Request submitted. ${supervisorName} has been notified.`, "success")
        router.push("/dashboard")
      } else if (result.code === ERRORS.OVERLAP_CONFLICT) {
        toast("These dates overlap an existing request. Choose different dates.", "error")
        setStep("pick")
        setSelection(null)
      } else {
        toast("Something went wrong. Please try again.", "error")
      }
    })
  }

  function handleSaveDraft() {
    if (!selection) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set("startDate", selection.startDate.toISOString())
      formData.set("endDate", selection.endDate.toISOString())
      formData.set("daysCount", String(selection.daysCount))

      const result = await saveDraft(null, formData)
      if (result.success) {
        toast("Draft saved.", "success")
        router.push("/dashboard")
      } else {
        toast("Failed to save draft. Please try again.", "error")
      }
    })
  }

  const remainingAfter = selection
    ? balance.remaining - selection.daysCount
    : balance.remaining

  return (
    <div>
      {step === "pick" && (
        <>
          <DateRangePicker blockedRanges={blockedRanges} onSelect={handleSelect} />
          {selection && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isPending}
                className="text-sm text-[var(--color-text-body)] underline hover:text-[var(--color-text-primary)]"
              >
                Save as Draft
              </button>
            </div>
          )}
        </>
      )}

      {step === "confirm" && selection && (
        <ConfirmationPopup
          startDate={selection.startDate}
          endDate={selection.endDate}
          daysCount={selection.daysCount}
          remainingAfter={remainingAfter}
          supervisorName={supervisorName}
          isPending={isPending}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )}
    </div>
  )
}
