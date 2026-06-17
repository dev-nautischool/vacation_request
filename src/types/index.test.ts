import { describe, it, expect } from "vitest"
import type { ActionResult } from "./index"

describe("ActionResult type", () => {
  it("success branch has data property", () => {
    const result: ActionResult<{ id: string }> = { success: true, data: { id: "abc" } }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("abc")
    }
  })

  it("failure branch has error and code properties", () => {
    const result: ActionResult<never> = {
      success: false,
      error: "Something went wrong",
      code: "UNAUTHORIZED",
    }
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe("Something went wrong")
      expect(result.code).toBe("UNAUTHORIZED")
    }
  })

  it("failure branch supports optional fields property", () => {
    const result: ActionResult<never> = {
      success: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fields: { email: "Invalid email" },
    }
    if (!result.success) {
      expect(result.fields?.email).toBe("Invalid email")
    }
  })
})
