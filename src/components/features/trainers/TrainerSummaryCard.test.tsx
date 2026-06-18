import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TrainerSummaryCard } from "./TrainerSummaryCard"
import type { BalanceSnapshot } from "@/lib/services/vacation-balance.service"

const baseBalance: BalanceSnapshot = {
  freshEntitlement: 25,
  carryOver: 0,
  carryOverExpiresAt: null,
  carryOverExpired: false,
  pending: 0,
  taken: 5,
  remaining: 20,
}

describe("TrainerSummaryCard", () => {
  it("renders trainer name", () => {
    render(
      <TrainerSummaryCard
        trainerId="t-1"
        trainerName="Alice Smith"
        balance={baseBalance}
        pendingCount={0}
      />,
    )
    expect(screen.getByText("Alice Smith")).toBeInTheDocument()
  })

  it("links to the trainer detail page", () => {
    render(
      <TrainerSummaryCard
        trainerId="t-1"
        trainerName="Alice"
        balance={baseBalance}
        pendingCount={0}
      />,
    )
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/trainers/t-1")
  })

  it("shows red badge when pendingCount > 0", () => {
    render(
      <TrainerSummaryCard
        trainerId="t-1"
        trainerName="Alice"
        balance={baseBalance}
        pendingCount={3}
      />,
    )
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("does not show badge when pendingCount === 0", () => {
    render(
      <TrainerSummaryCard
        trainerId="t-1"
        trainerName="Alice"
        balance={baseBalance}
        pendingCount={0}
      />,
    )
    // Badge text "0" should not be present
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })
})
