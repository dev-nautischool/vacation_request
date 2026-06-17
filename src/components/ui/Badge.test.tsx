import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Badge } from "./Badge"

const STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED", "REVOKED"] as const

describe("Badge", () => {
  it("renders the status label text for all six statuses", () => {
    STATUSES.forEach((status) => {
      const { unmount } = render(<Badge status={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
      unmount()
    })
  })

  it("always includes a visible text label (not color-only)", () => {
    render(<Badge status="APPROVED" />)
    const badge = screen.getByText("APPROVED")
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBeTruthy()
  })

  it("applies a data-status attribute for each status", () => {
    STATUSES.forEach((status) => {
      const { unmount } = render(<Badge status={status} />)
      expect(screen.getByText(status)).toHaveAttribute("data-status", status.toLowerCase())
      unmount()
    })
  })
})
