import type { ButtonHTMLAttributes } from "react"

type ButtonVariant = "primary" | "outline" | "secondary" | "danger"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
    "border-2 border-[var(--color-primary)]",
    "hover:bg-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]",
  ].join(" "),
  outline: [
    "bg-transparent text-[var(--color-primary)]",
    "border-2 border-[var(--color-primary)]",
    "hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]",
  ].join(" "),
  secondary: [
    "bg-transparent text-[var(--color-text-primary)]",
    "border-2 border-[var(--color-border)]",
    "hover:bg-[var(--color-text-primary)] hover:text-[var(--color-on-primary)]",
  ].join(" "),
  danger: [
    "bg-transparent text-[var(--color-status-rejected)]",
    "border-2 border-[var(--color-status-rejected)]",
    "hover:bg-[var(--color-status-rejected)] hover:text-[var(--color-on-primary)]",
  ].join(" "),
}

const BASE =
  "inline-flex items-center justify-center px-[22px] py-[13px] " +
  "font-[var(--font-heading)] text-[14px] font-bold uppercase tracking-[0.15em] " +
  "cursor-pointer transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed"

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
