import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Modal } from "./Modal"

describe("Modal", () => {
  it("renders children when open", () => {
    render(
      <Modal open onClose={() => {}}>
        Modal content
      </Modal>,
    )
    expect(screen.getByText("Modal content")).toBeInTheDocument()
  })

  it("does not render children when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Hidden content
      </Modal>,
    )
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument()
  })

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        Content
      </Modal>,
    )
    await userEvent.click(screen.getByTestId("modal-backdrop"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when Escape key is pressed", async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        Content
      </Modal>,
    )
    await userEvent.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalledOnce()
  })
})
