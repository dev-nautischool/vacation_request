import { describe, it, expect } from "vitest"
import { canActorPerformAction } from "./rbac"
import type { Actor, Action } from "./rbac"

const trainer: Actor = { id: "t1", role: "TRAINER" }
const supervisor: Actor = { id: "s1", role: "SUPERVISOR" }

const trainerActions: Action[] = ["SUBMIT_REQUEST", "SAVE_DRAFT", "CANCEL_REQUEST"]
const supervisorActions: Action[] = [
  "APPROVE_REQUEST",
  "REJECT_REQUEST",
  "REVOKE_REQUEST",
  "SET_ENTITLEMENT",
  "MANAGE_USERS",
  "CONFIGURE_FALLBACK",
]

describe("canActorPerformAction", () => {
  describe("TRAINER", () => {
    it.each(trainerActions)("allows %s", (action) => {
      expect(canActorPerformAction(trainer, action)).toBe(true)
    })

    it.each(supervisorActions)("denies %s", (action) => {
      expect(canActorPerformAction(trainer, action)).toBe(false)
    })
  })

  describe("SUPERVISOR", () => {
    it.each(supervisorActions)("allows %s", (action) => {
      expect(canActorPerformAction(supervisor, action)).toBe(true)
    })

    it.each(trainerActions)("denies %s", (action) => {
      expect(canActorPerformAction(supervisor, action)).toBe(false)
    })
  })

  it("ignores the resource argument (it is for future use)", () => {
    expect(canActorPerformAction(trainer, "SUBMIT_REQUEST", { id: "req-1" })).toBe(true)
    expect(canActorPerformAction(supervisor, "APPROVE_REQUEST", { id: "req-1" })).toBe(true)
  })
})
