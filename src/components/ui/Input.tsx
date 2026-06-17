"use client"

import { useState, type InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
}

export function Input({ id, label, error, className = "", onChange, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)
  const [hasInputValue, setHasInputValue] = useState(Boolean(props.defaultValue))
  const isControlled = props.value !== undefined
  const hasValue = isControlled ? Boolean(props.value) : hasInputValue
  const isFloated = focused || hasValue

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        className={[
          "peer block w-full h-[50px] px-3 pt-5 pb-1",
          "bg-[var(--color-surface-gray-2)]",
          "border-2",
          error
            ? "border-[var(--color-status-rejected)]"
            : "border-[var(--color-border)] focus:border-[var(--color-primary)]",
          "font-[var(--font-body)] text-[14px] text-[var(--color-text-body)]",
          "outline-none transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ]
          .join(" ")}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          if (!isControlled) setHasInputValue(e.target.value.length > 0)
          onChange?.(e)
        }}
        {...props}
      />
      <label
        htmlFor={id}
        className={[
          "absolute left-3 transition-all duration-150 pointer-events-none",
          "font-[var(--font-body)] text-[var(--color-text-body)]",
          isFloated
            ? "top-1 text-[10px]"
            : "top-[50%] -translate-y-1/2 text-[14px]",
        ].join(" ")}
      >
        {label}
      </label>
      {error && (
        <span className="block mt-1 text-[12px] text-[var(--color-status-rejected)]">
          {error}
        </span>
      )}
    </div>
  )
}
