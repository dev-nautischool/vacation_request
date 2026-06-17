import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Input } from "./Input"

describe("Input", () => {
  it("renders a label and an input", () => {
    render(<Input id="email" label="Email" />)
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("shows placeholder via label (floating label pattern)", () => {
    render(<Input id="name" label="Full Name" />)
    expect(screen.getByText("Full Name")).toBeInTheDocument()
  })

  it("passes value and onChange to the underlying input", async () => {
    render(<Input id="test" label="Test" defaultValue="" />)
    const input = screen.getByRole("textbox")
    await userEvent.type(input, "hello")
    expect(input).toHaveValue("hello")
  })

  it("renders in error state when error prop is provided", () => {
    render(<Input id="err" label="Field" error="Required" />)
    expect(screen.getByText("Required")).toBeInTheDocument()
  })

  it("is disabled when disabled prop is set", () => {
    render(<Input id="dis" label="Field" disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })
})
