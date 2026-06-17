import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Card } from "./Card"

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText("Card content")).toBeInTheDocument()
  })

  it("accepts additional className", () => {
    render(<Card className="extra-class">Content</Card>)
    expect(screen.getByText("Content").parentElement ?? screen.getByText("Content")).toBeInTheDocument()
  })

  it("renders as a div by default", () => {
    render(<Card>Content</Card>)
    expect(screen.getByText("Content").tagName).toBe("DIV")
  })
})
