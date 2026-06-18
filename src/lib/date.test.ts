import { describe, expect, it } from "vitest"
import { TZDate, formatDate, workingDaysBetween } from "./date"

describe("TZDate", () => {
  it("produces midnight CET for a January date (UTC+1)", () => {
    const d = TZDate(2026, 0, 15) // January 15, 2026 — CET = UTC+1
    // Zurich midnight Jan 15 = UTC Jan 14 23:00
    expect(d.toISOString()).toBe("2026-01-14T23:00:00.000Z")
  })

  it("produces midnight CEST for a July date (UTC+2)", () => {
    const d = TZDate(2026, 6, 14) // July 14, 2026 — CEST = UTC+2
    // Zurich midnight Jul 14 = UTC Jul 13 22:00
    expect(d.toISOString()).toBe("2026-07-13T22:00:00.000Z")
  })

  it("produces midnight for March 1 (CET, UTC+1) — carry-over expiry policy date", () => {
    const d = TZDate(2026, 2, 1) // March 1, 2026 — CET = UTC+1
    expect(d.toISOString()).toBe("2026-02-28T23:00:00.000Z")
  })

  it("produces midnight for February 1 (CET, UTC+1) — carry-over reminder policy date", () => {
    const d = TZDate(2026, 1, 1) // February 1, 2026 — CET = UTC+1
    expect(d.toISOString()).toBe("2026-01-31T23:00:00.000Z")
  })

  it("accepts optional tz argument without throwing", () => {
    expect(() => TZDate(2026, 0, 1, "Europe/Zurich")).not.toThrow()
  })
})

describe("formatDate", () => {
  it("formats a date as 'Mon 14 Jul 2026'", () => {
    // July 14, 2026 is a Tuesday
    const d = new Date("2026-07-14T12:00:00Z")
    expect(formatDate(d)).toBe("Tue 14 Jul 2026")
  })

  it("formats a winter date correctly", () => {
    // January 15, 2026 is a Thursday
    const d = new Date("2026-01-15T12:00:00Z")
    expect(formatDate(d)).toBe("Thu 15 Jan 2026")
  })
})

describe("workingDaysBetween", () => {
  it("returns 5 for a Mon-to-Mon span", () => {
    // Mon Mar 2 to Mon Mar 9 = 5 working days (Mon–Fri)
    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-09T00:00:00Z")
    expect(workingDaysBetween(from, to)).toBe(5)
  })

  it("returns 1 for Fri-to-Mon span", () => {
    // Fri Mar 6 (inclusive) to Mon Mar 9 (exclusive) = 1 working day (Friday)
    const from = new Date("2026-03-06T00:00:00Z")
    const to = new Date("2026-03-09T00:00:00Z")
    expect(workingDaysBetween(from, to)).toBe(1)
  })

  it("returns 0 for Sat-to-Mon span", () => {
    const from = new Date("2026-03-07T00:00:00Z") // Saturday
    const to = new Date("2026-03-09T00:00:00Z") // Monday (exclusive)
    expect(workingDaysBetween(from, to)).toBe(0)
  })

  it("returns 0 when from equals to", () => {
    const d = new Date("2026-03-02T00:00:00Z")
    expect(workingDaysBetween(d, d)).toBe(0)
  })

  it("treats public holidays as working days (no holiday logic)", () => {
    // Christmas 2026 is a Friday — should still count
    const from = new Date("2026-12-25T00:00:00Z")
    const to = new Date("2026-12-26T00:00:00Z")
    expect(workingDaysBetween(from, to)).toBe(1) // Friday counts
  })
})
