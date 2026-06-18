import { TZDate } from "@/lib/date"
import { prisma } from "@/lib/prisma"

export interface BalanceSnapshot {
  freshEntitlement: number
  carryOver: number
  carryOverExpiresAt: Date | null
  carryOverExpired: boolean
  pending: number
  taken: number
  remaining: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Returns the number of calendar days from [startDate, endDate] (both inclusive)
 * that fall within the given calendar year, using Europe/Zurich year boundaries.
 */
function countDaysInYear(startDate: Date, endDate: Date, year: number): number {
  const yearStart = TZDate(year, 0, 1) // Jan 1 of year (midnight Zurich)
  const yearEnd = TZDate(year + 1, 0, 1) // Jan 1 of year+1 (exclusive)
  // endDate is the last day (inclusive), convert to exclusive end
  const endExclusive = new Date(endDate.getTime() + MS_PER_DAY)

  const effStart = startDate < yearStart ? yearStart : startDate
  const effEnd = endExclusive > yearEnd ? yearEnd : endExclusive

  if (effStart >= effEnd) return 0
  return Math.round((effEnd.getTime() - effStart.getTime()) / MS_PER_DAY)
}

/**
 * Computes the vacation balance for a trainer for a given calendar year.
 * All values are derived dynamically from request and entitlement records — no snapshot is stored.
 */
export async function computeBalance(trainerId: string, year: number): Promise<BalanceSnapshot> {
  const now = new Date()

  // 1. Fresh entitlement for the year
  const entitlement = await prisma.entitlement.findUnique({
    where: { trainerId_year: { trainerId, year } },
    select: { days: true },
  })
  const freshEntitlement = entitlement?.days ?? 0

  // 2. Carry-over from year-1
  // Carry-over expires on March 1 of the current year (Europe/Zurich)
  const carryOverExpiresAt = TZDate(year, 2, 1) // March 1 (month is 0-indexed: 2=March)
  const carryOverExpired = now >= carryOverExpiresAt

  let carryOver = 0
  if (!carryOverExpired) {
    const prevEntitlement = await prisma.entitlement.findUnique({
      where: { trainerId_year: { trainerId, year: year - 1 } },
      select: { days: true },
    })
    if (prevEntitlement && prevEntitlement.days > 0) {
      // Days consumed from year-1 = APPROVED request days that fall in year-1
      const prevYearRequests = await prisma.vacationRequest.findMany({
        where: {
          trainerId,
          status: "APPROVED",
        },
        select: { startDate: true, endDate: true },
      })
      const consumedPrevYear = prevYearRequests.reduce(
        (sum, req) => sum + countDaysInYear(req.startDate, req.endDate, year - 1),
        0,
      )
      carryOver = Math.max(0, prevEntitlement.days - consumedPrevYear)
    }
  }

  // 3. Current year requests: PENDING and APPROVED
  const currentRequests = await prisma.vacationRequest.findMany({
    where: {
      trainerId,
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { startDate: true, endDate: true, status: true },
  })

  let pending = 0
  let taken = 0

  for (const req of currentRequests) {
    const daysThisYear = countDaysInYear(req.startDate, req.endDate, year)
    if (daysThisYear === 0) continue

    if (req.status === "PENDING") {
      pending += daysThisYear
    } else {
      // APPROVED: future = pending, past = taken
      if (req.endDate >= now) {
        pending += daysThisYear
      } else {
        taken += daysThisYear
      }
    }
  }

  const remaining = Math.max(0, freshEntitlement + carryOver - pending - taken)

  return {
    freshEntitlement,
    carryOver,
    carryOverExpiresAt: carryOverExpired ? null : carryOverExpiresAt,
    carryOverExpired,
    pending,
    taken,
    remaining,
  }
}
