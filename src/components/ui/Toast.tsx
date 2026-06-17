"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

type ToastType = "default" | "success" | "error"

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION = 4000

const typeStyles: Record<ToastType, string> = {
  default: "",
  success: "border-l-4 border-l-[var(--color-status-approved)]",
  error: "border-l-4 border-l-[var(--color-status-rejected)]",
}

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(item.id), TOAST_DURATION)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [item.id, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex items-start gap-3",
        "bg-[var(--color-text-primary)] text-white",
        "px-4 py-3 max-w-[380px] w-full",
        "font-[var(--font-body)] text-[14px]",
        typeStyles[item.type],
      ].join(" ")}
    >
      <span className="flex-1">{item.message}</span>
      <button
        aria-label="Dismiss"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 text-white/70 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = "default") => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed bottom-left */}
      <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastItem item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}
