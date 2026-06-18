"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { deleteDraft } from "@/lib/actions/requests"
import { formatDate } from "@/lib/date"

interface DraftCardProps {
  draftId: string
  startDate: Date
  endDate: Date
  daysCount: number
}

export function DraftCard({ draftId, startDate, endDate, daysCount }: DraftCardProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("draftId", draftId)
      const result = await deleteDraft(null, formData)
      if (result.success) {
        toast("Draft deleted.", "success")
      } else {
        toast("Failed to delete draft.", "error")
      }
    })
  }

  return (
    <div className="border border-[var(--color-border)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] mb-1">
          Draft
        </p>
        <p className="text-[var(--color-text-primary)] font-medium">
          {formatDate(startDate)} — {formatDate(endDate)}
        </p>
        <p className="text-sm text-[var(--color-text-body)] mt-1">
          {daysCount} {daysCount === 1 ? "day" : "days"}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/requests/new">
          <Button variant="primary" type="button" disabled={isPending}>
            Continue
          </Button>
        </Link>
        <Button variant="danger" type="button" onClick={handleDelete} disabled={isPending}>
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  )
}
