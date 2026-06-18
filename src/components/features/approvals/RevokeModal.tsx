"use client"

import { useActionState, useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"
import { revokeRequest } from "@/lib/actions/approvals"

interface RevokeModalProps {
  requestId: string
  onClose: () => void
}

export function RevokeModal({ requestId, onClose }: RevokeModalProps) {
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [validationError, setValidationError] = useState("")

  const [state, formAction, isPending] = useActionState(revokeRequest, null)

  if (state && !state.success) {
    toast(state.error, "error")
  }

  function handleSubmit(formData: FormData) {
    if (!reason.trim()) {
      setValidationError("A reason is required")
      return
    }
    setValidationError("")
    formAction(formData)
  }

  return (
    <Modal open onClose={onClose} title="Revoke Approval">
      <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)] mb-4">
        Are you sure? This will revoke the approval. A reason is required.
      </p>

      <form action={handleSubmit}>
        <input type="hidden" name="requestId" value={requestId} />
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            if (validationError) setValidationError("")
          }}
          rows={4}
          placeholder="Enter a reason for revoking…"
          className="w-full border border-[var(--color-border)] p-3 font-[var(--font-body)] text-[14px] text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-2"
        />
        {validationError && (
          <p className="text-[var(--color-status-rejected)] text-[12px] mb-4">
            {validationError}
          </p>
        )}
        <div className="flex gap-4 mt-4">
          <Button type="submit" variant="danger" disabled={isPending}>
            {isPending ? "Revoking…" : "Confirm"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
