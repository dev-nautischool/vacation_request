import type { ReactNode } from "react"

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="flex-1 pb-[60px] md:pb-0">
      <div className="max-w-[1200px] mx-auto px-[15px] py-8">
        {children}
      </div>
    </main>
  )
}
