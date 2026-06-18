import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TrainerRequestHistory } from "./TrainerRequestHistory"

const makeRequest = (overrides: Partial<{
  id: string
  startDate: Date
  endDate: Date
  daysCount: number
  status: string
  reason: string | null
  createdAt: Date
}> = {}) => ({
  id: "req-1",
  startDate: new Date("2026-08-10T22:00:00Z"),
  endDate: new Date("2026-08-14T22:00:00Z"),
  daysCount: 5,
  status: "PENDING",
  reason: null,
  createdAt: new Date("2026-07-01T10:00:00Z"),
  ...overrides,
})

describe("TrainerRequestHistory", () => {
  it("renders empty state when requests array is empty", () => {
    render(<TrainerRequestHistory requests={[]} />)
    expect(screen.getByText("No requests yet for this trainer.")).toBeInTheDocument()
  })

  it("renders a PENDING request without reason sub-row", () => {
    render(<TrainerRequestHistory requests={[makeRequest({ status: "PENDING" })]} />)
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
  })

  it("renders a REJECTED request with reason sub-row", () => {
    render(
      <TrainerRequestHistory
        requests={[makeRequest({ status: "REJECTED", reason: "Too many absences" })]}
      />,
    )
    expect(screen.getByText(/Too many absences/)).toBeInTheDocument()
    expect(screen.getByText(/Reason:/)).toBeInTheDocument()
  })

  it("renders a REVOKED request with reason sub-row", () => {
    render(
      <TrainerRequestHistory
        requests={[makeRequest({ status: "REVOKED", reason: "Event cancelled" })]}
      />,
    )
    expect(screen.getByText(/Event cancelled/)).toBeInTheDocument()
  })

  it("renders a REJECTED request without reason sub-row when reason is null", () => {
    render(
      <TrainerRequestHistory
        requests={[makeRequest({ status: "REJECTED", reason: null })]}
      />,
    )
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
  })

  it("renders APPROVED and CANCELLED rows without reason sub-row", () => {
    render(
      <TrainerRequestHistory
        requests={[
          makeRequest({ id: "a", status: "APPROVED", reason: null }),
          makeRequest({ id: "b", status: "CANCELLED", reason: null }),
        ]}
      />,
    )
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
  })
})
