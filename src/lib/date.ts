const ZURICH_TZ = "Europe/Zurich"

/**
 * Creates a Date representing midnight at the start of the given date in Europe/Zurich.
 * Month is 0-indexed (0=January, 11=December), matching the Date constructor convention.
 * The `tz` parameter is accepted for call-site clarity but is always Europe/Zurich.
 */
export function TZDate(year: number, month: number, day: number, _tz: string = ZURICH_TZ): Date {
  const yyyy = String(year).padStart(4, "0")
  const mm = String(month + 1).padStart(2, "0")
  const dd = String(day).padStart(2, "0")

  // Probe at noon UTC to determine Zurich's UTC offset for this calendar date.
  // Noon avoids any edge where DST transitions at 2 AM could affect the date itself.
  const probeUTC = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`)
  const zurichHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: ZURICH_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(probeUTC)

  const zurichHour = parseInt(zurichHourStr, 10)
  const offsetHours = zurichHour - 12 // e.g. 13 → +1 (CET), 14 → +2 (CEST)

  // Zurich midnight = UTC midnight of that date, minus the offset.
  // setUTCHours accepts negative values and normalises to the previous day correctly.
  const midnightUTC = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`)
  midnightUTC.setUTCHours(-offsetHours)
  return midnightUTC
}

/**
 * Formats a Date as "Mon 14 Jul 2026" in the Europe/Zurich timezone.
 */
export function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZURICH_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`
}

/**
 * Counts Monday–Friday working days from `from` (inclusive) to `to` (exclusive).
 * Does not account for public holidays.
 */
export function workingDaysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const start = new Date(from)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setUTCHours(0, 0, 0, 0)

  let count = 0
  const cur = new Date(start)
  while (cur < end) {
    const dow = cur.getUTCDay() // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) count++
    cur.setTime(cur.getTime() + MS_PER_DAY)
  }
  return count
}
