import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Skeleton } from "./Skeleton"

describe("Skeleton", () => {
  it("renders card variant", () => {
    render(<Skeleton variant="card" data-testid="skel" />)
    expect(screen.getByTestId("skel")).toBeInTheDocument()
  })

  it("renders table-row variant", () => {
    render(<Skeleton variant="table-row" data-testid="skel" />)
    expect(screen.getByTestId("skel")).toBeInTheDocument()
  })

  it("card variant has a minimum height", () => {
    render(<Skeleton variant="card" data-testid="skel" />)
    const el = screen.getByTestId("skel")
    expect(el.className).toMatch(/h-/)
  })

  it("applies additional className", () => {
    render(<Skeleton variant="card" className="extra" data-testid="skel" />)
    expect(screen.getByTestId("skel").className).toContain("extra")
  })
})
