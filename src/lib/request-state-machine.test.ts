import { describe, expect, it } from "vitest"
import { canTransition } from "./request-state-machine"

describe("canTransition", () => {
  describe("DRAFT → PENDING", () => {
    it("allows TRAINER", () => {
      expect(canTransition("DRAFT", "PENDING", "TRAINER")).toBe(true)
    })
    it("blocks SUPERVISOR", () => {
      expect(canTransition("DRAFT", "PENDING", "SUPERVISOR")).toBe(false)
    })
    it("blocks FALLBACK", () => {
      expect(canTransition("DRAFT", "PENDING", "FALLBACK")).toBe(false)
    })
  })

  describe("PENDING → APPROVED", () => {
    it("allows SUPERVISOR", () => {
      expect(canTransition("PENDING", "APPROVED", "SUPERVISOR")).toBe(true)
    })
    it("allows FALLBACK", () => {
      expect(canTransition("PENDING", "APPROVED", "FALLBACK")).toBe(true)
    })
    it("blocks TRAINER", () => {
      expect(canTransition("PENDING", "APPROVED", "TRAINER")).toBe(false)
    })
  })

  describe("PENDING → REJECTED", () => {
    it("allows SUPERVISOR", () => {
      expect(canTransition("PENDING", "REJECTED", "SUPERVISOR")).toBe(true)
    })
    it("allows FALLBACK", () => {
      expect(canTransition("PENDING", "REJECTED", "FALLBACK")).toBe(true)
    })
    it("blocks TRAINER", () => {
      expect(canTransition("PENDING", "REJECTED", "TRAINER")).toBe(false)
    })
  })

  describe("PENDING → CANCELLED", () => {
    it("allows TRAINER", () => {
      expect(canTransition("PENDING", "CANCELLED", "TRAINER")).toBe(true)
    })
    it("blocks SUPERVISOR", () => {
      expect(canTransition("PENDING", "CANCELLED", "SUPERVISOR")).toBe(false)
    })
  })

  describe("APPROVED → CANCELLED", () => {
    it("allows TRAINER", () => {
      expect(canTransition("APPROVED", "CANCELLED", "TRAINER")).toBe(true)
    })
    it("blocks SUPERVISOR", () => {
      expect(canTransition("APPROVED", "CANCELLED", "SUPERVISOR")).toBe(false)
    })
  })

  describe("APPROVED → REVOKED", () => {
    it("allows SUPERVISOR", () => {
      expect(canTransition("APPROVED", "REVOKED", "SUPERVISOR")).toBe(true)
    })
    it("blocks TRAINER", () => {
      expect(canTransition("APPROVED", "REVOKED", "TRAINER")).toBe(false)
    })
    it("blocks FALLBACK", () => {
      expect(canTransition("APPROVED", "REVOKED", "FALLBACK")).toBe(false)
    })
  })

  describe("terminal states", () => {
    it("blocks any transition from REJECTED", () => {
      expect(canTransition("REJECTED", "PENDING", "SUPERVISOR")).toBe(false)
      expect(canTransition("REJECTED", "CANCELLED", "TRAINER")).toBe(false)
    })
    it("blocks any transition from CANCELLED", () => {
      expect(canTransition("CANCELLED", "PENDING", "TRAINER")).toBe(false)
      expect(canTransition("CANCELLED", "APPROVED", "SUPERVISOR")).toBe(false)
    })
    it("blocks any transition from REVOKED", () => {
      expect(canTransition("REVOKED", "APPROVED", "SUPERVISOR")).toBe(false)
      expect(canTransition("REVOKED", "CANCELLED", "TRAINER")).toBe(false)
    })
  })

  describe("unknown combinations", () => {
    it("returns false for DRAFT → APPROVED", () => {
      expect(canTransition("DRAFT", "APPROVED", "SUPERVISOR")).toBe(false)
    })
    it("returns false for PENDING → DRAFT", () => {
      expect(canTransition("PENDING", "DRAFT", "TRAINER")).toBe(false)
    })
  })
})
