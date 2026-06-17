import type { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "bg-[var(--color-surface)]",
        "border border-[var(--color-border)]",
        "p-5 md:p-[35px]",
        "transition-colors duration-150",
        "hover:border-[var(--color-primary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}
