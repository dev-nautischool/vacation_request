import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ToastProvider, useToast } from "./Toast"

type TestType = "success" | "error" | "default"

function ToastButton({ message = "Hello", type }: { message?: string; type?: TestType }) {
  const { toast } = useToast()
  return <button onClick={() => toast(message, type)}>Show Toast</button>
}

function TestApp({ message, type }: { message?: string; type?: TestType }) {
  return (
    <ToastProvider>
      <ToastButton message={message} type={type} />
    </ToastProvider>
  )
}

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows a toast message when triggered", () => {
    render(<TestApp message="Saved!" />)
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }))
    expect(screen.getByText("Saved!")).toBeInTheDocument()
  })

  it("renders a status role for ARIA announcement", () => {
    render(<TestApp message="Done" />)
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }))
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("auto-dismisses after 4 seconds", () => {
    vi.useFakeTimers()
    render(<TestApp message="Bye" />)
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }))
    expect(screen.getByText("Bye")).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText("Bye")).not.toBeInTheDocument()
  })

  it("dismisses when X button is clicked", () => {
    render(<TestApp message="Dismiss me" />)
    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }))
    expect(screen.getByText("Dismiss me")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument()
  })
})
