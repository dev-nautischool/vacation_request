"use client"

import { useEffect, useId, type ReactNode } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        data-testid="modal-backdrop"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 bg-[var(--color-surface)] border border-[var(--color-border)] p-8 max-w-lg w-full mx-4">
        {title && (
          <h3 id={titleId} className="mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  )
}
