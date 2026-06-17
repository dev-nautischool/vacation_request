import { describe, it, expect } from "vitest"
import { ERRORS } from "./errors"
import type { ErrorCode } from "./errors"

describe("ERRORS constants", () => {
  it("exports all required error code constants", () => {
    const required: ErrorCode[] = [
      "INVALID_TRANSITION",
      "OVERLAP_CONFLICT",
      "ENTITLEMENT_LOCKED",
      "INSUFFICIENT_BALANCE",
      "UNAUTHORIZED",
      "NOT_FOUND",
      "VALIDATION_ERROR",
    ]
    for (const code of required) {
      expect(ERRORS[code]).toBe(code)
    }
  })

  it("has exactly 7 error codes", () => {
    expect(Object.keys(ERRORS)).toHaveLength(7)
  })
})
