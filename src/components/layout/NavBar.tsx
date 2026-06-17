"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/lib/actions/auth"
import type { NavItem } from "./nav-items"

interface NavBarProps {
  navItems: NavItem[]
  userName: string
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

export function NavBar({ navItems, userName }: NavBarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center h-[60px] border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 shrink-0">
        <span className="font-[var(--font-heading)] text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mr-8 whitespace-nowrap">
          Morges Natation
        </span>
        <nav className="flex items-center flex-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center h-[60px] px-4",
                "font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em]",
                "border-b-2 transition-colors duration-150",
                isActive(pathname, item.href)
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-primary)]",
              ].join(" ")}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-6 ml-4">
          <span className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)] whitespace-nowrap">
            {userName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-body)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-1 flex-col items-center justify-center py-3 min-h-[56px]",
              "font-[var(--font-heading)] text-[10px] font-bold uppercase tracking-[0.1em]",
              "transition-colors duration-150",
              isActive(pathname, item.href)
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-text-body)]",
            ].join(" ")}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
