import { describe, it, expect } from "vitest"
import { getNavItems } from "./nav-items"

describe("getNavItems", () => {
  it("returns correct items for TRAINER", () => {
    const hrefs = getNavItems("TRAINER").map((i) => i.href)
    expect(hrefs).toContain("/dashboard")
    expect(hrefs).toContain("/requests")
    expect(hrefs).toContain("/notifications")
    expect(hrefs).not.toContain("/approvals")
    expect(hrefs).not.toContain("/trainers")
    expect(hrefs).not.toContain("/users")
  })

  it("returns correct items for SUPERVISOR", () => {
    const hrefs = getNavItems("SUPERVISOR").map((i) => i.href)
    expect(hrefs).toContain("/dashboard")
    expect(hrefs).toContain("/approvals")
    expect(hrefs).toContain("/trainers")
    expect(hrefs).toContain("/users")
    expect(hrefs).toContain("/notifications")
    expect(hrefs).not.toContain("/requests")
  })

  it("preserves declaration order", () => {
    const trainerHrefs = getNavItems("TRAINER").map((i) => i.href)
    expect(trainerHrefs[0]).toBe("/dashboard")
    expect(trainerHrefs[trainerHrefs.length - 1]).toBe("/notifications")

    const supervisorHrefs = getNavItems("SUPERVISOR").map((i) => i.href)
    expect(supervisorHrefs[0]).toBe("/dashboard")
    expect(supervisorHrefs[supervisorHrefs.length - 1]).toBe("/notifications")
  })
})
