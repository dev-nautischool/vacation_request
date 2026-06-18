---
story_key: 3-1-request-state-machine-and-core-domain-services
epic: 3
story: 1
baseline_commit: 5c9d3472a7f0d9ad0b9e8172b0983be340f243e2
---

# Story 3.1: Request State Machine & Core Domain Services

Status: done

## Story

As a developer,
I want the request state machine, balance service, date utilities, and audit service wired up,
So that all subsequent trainer and supervisor stories can rely on a consistent, rule-enforced domain foundation.

## Acceptance Criteria

1. **Given** `src/lib/request-state-machine.ts`  
   **When** inspected  
   **Then** the TRANSITIONS table covers all valid transitions (DRAFT→PENDING for TRAINER; PENDING→APPROVED/REJECTED for SUPERVISOR/FALLBACK; PENDING→CANCELLED for TRAINER; APPROVED→CANCELLED for TRAINER; APPROVED→REVOKED for SUPERVISOR)  
   **And** `canTransition(from, to, actorRole)` returns false for any unlisted transition

2. **Given** `canTransition` returns false for a given transition  
   **When** any Server Action attempts the mutation  
   **Then** it returns `ActionResult` error with code `INVALID_TRANSITION` without touching the database  
   *(Guard logic lives in the service layer; this story creates the guard function only)*

3. **Given** `src/lib/date.ts`  
   **When** inspected  
   **Then** it exports `formatDate` (outputs "Mon 14 Jul 2026" format), `workingDaysBetween`, and `TZDate` constructors that always use `Europe/Zurich` — never bare `new Date()` in business logic

4. **Given** `src/lib/services/vacation-balance.service.ts`  
   **When** `computeBalance(trainerId, year)` is called  
   **Then** it returns fresh entitlement, carry-over (with expiry), pending days, taken days, and remaining — computed dynamically from request and entitlement records, with no persisted snapshot

5. **Given** a request that spans December 28–January 3  
   **When** `computeBalance` calculates days for each year  
   **Then** December days are deducted from Year N's balance and January days from Year N+1's balance

6. **Given** `src/lib/services/audit.service.ts`  
   **When** `log(actorId, action, entityType, entityId, metadata)` is called  
   **Then** an `audit_logs` record is inserted with the current UTC timestamp  
   **And** no UPDATE or DELETE is ever issued against that record

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/request-state-machine.ts` (AC: 1, 2)
  - [x] Define `type ActorRole = 'TRAINER' | 'SUPERVISOR' | 'FALLBACK'`
  - [x] Define `TRANSITIONS` table using `RequestStatus` enum from `@/generated/prisma/enums`
  - [x] Implement `canTransition(from: RequestStatus, to: RequestStatus, actorRole: ActorRole): boolean`
  - [x] All valid transitions: DRAFT→PENDING/TRAINER; PENDING→APPROVED/SUPERVISOR,FALLBACK; PENDING→REJECTED/SUPERVISOR,FALLBACK; PENDING→CANCELLED/TRAINER; APPROVED→CANCELLED/TRAINER; APPROVED→REVOKED/SUPERVISOR
  - [x] Returns `false` for any transition not in TRANSITIONS or role not in allowed roles

- [x] Task 2: Create `src/lib/request-state-machine.test.ts` (AC: 1, 2)
  - [x] All valid transitions return `true` for the correct actor role
  - [x] All valid transitions return `false` for wrong actor roles (e.g. TRAINER cannot APPROVE)
  - [x] Terminal states (REJECTED, CANCELLED, REVOKED) return `false` for any transition
  - [x] Unknown from/to combinations return `false`

- [x] Task 3: Create `src/lib/date.ts` (AC: 3)
  - [x] `TZDate(year, month, day, tz?)`: creates a Date representing midnight at the given date in Europe/Zurich (month is 0-indexed, `tz` param accepted for API compatibility)
  - [x] `formatDate(date: Date): string`: returns "Mon 14 Jul 2026" format using Europe/Zurich timezone
  - [x] `workingDaysBetween(from: Date, to: Date): number`: counts Mon-Fri days from `from` (inclusive) to `to` (exclusive)

- [x] Task 4: Create `src/lib/date.test.ts` (AC: 3)
  - [x] `TZDate`: verify CET date (January — UTC+1), CEST date (July — UTC+2), March 1 policy date
  - [x] `formatDate`: verify correct output format "Mon 14 Jul 2026" for a known date
  - [x] `workingDaysBetween`: Mon-to-Mon span = 5, Fri-to-Mon span = 1, includes public holidays as working days (no holiday logic), span of 0 = 0

- [x] Task 5: Create `src/lib/services/vacation-balance.service.ts` (AC: 4, 5)
  - [x] Define `BalanceSnapshot` interface: `{ freshEntitlement, carryOver, carryOverExpiresAt, carryOverExpired, pending, taken, remaining }`
  - [x] `computeBalance(trainerId: string, year: number): Promise<BalanceSnapshot>`
    - [x] Fetch entitlement for the year; `freshEntitlement = entitlement?.days ?? 0`
    - [x] Compute carry-over: `entitlement[year-1].days - approvedDaysInYear(year-1)`; clamp to 0; set to 0 if today ≥ TZDate(year, 2, 1) (March 1)
    - [x] Fetch all PENDING + APPROVED requests for trainer; split days per year using `countDaysInYear(startDate, endDate, year)`
    - [x] `pending` = days from PENDING requests in year + days from APPROVED requests where `endDate >= today` in year
    - [x] `taken` = days from APPROVED requests where `endDate < today` in year
    - [x] `remaining = freshEntitlement + carryOver - pending - taken`
  - [x] Helper `countDaysInYear(startDate: Date, endDate: Date, year: number): number` — handles cross-year split; endDate is inclusive so add 1 day before year-boundary comparison

- [x] Task 6: Create `src/lib/services/vacation-balance.service.test.ts` (AC: 4, 5)
  - [x] No entitlement set → all zeros
  - [x] Simple case: 20-day entitlement, 5 pending days → remaining = 15
  - [x] Carry-over: 20-day entitlement in year N-1, 14 days taken → 6 carry-over into year N
  - [x] Carry-over expired (today ≥ March 1 of year N) → carry-over = 0
  - [x] Cross-year request Dec 28–Jan 3: 4 days charged to year N

- [x] Task 7: Create `src/lib/services/audit.service.ts` (AC: 6)
  - [x] `log(actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown>): Promise<void>`
  - [x] Insert using `prisma.auditLog.create({ data: { actorId, action, entityType, entityId, timestamp: new Date(), metadata } })`
  - [x] Never performs UPDATE or DELETE on audit_logs

- [x] Task 8: Create `src/lib/services/audit.service.test.ts` (AC: 6)
  - [x] `log` calls `prisma.auditLog.create` with correct shape
  - [x] `timestamp` is set (Date instance)
  - [x] Verify no update/delete calls are made

## Dev Notes

### ActorRole vs Role enum

The `Role` enum from `@/generated/prisma/enums` only has `TRAINER | SUPERVISOR`. The state machine also needs `'FALLBACK'` (a derived state from the `fallback_approvers` table, not a DB-level role). Define a local `ActorRole` type in `request-state-machine.ts`:

```ts
import { RequestStatus, Role } from "@/generated/prisma/enums"
export type ActorRole = Role | 'FALLBACK'
```

### TRANSITIONS table

```ts
const TRANSITIONS: Partial<Record<RequestStatus, Partial<Record<RequestStatus, ActorRole[]>>>> = {
  DRAFT:    { PENDING: ['TRAINER'] },
  PENDING:  { APPROVED: ['SUPERVISOR', 'FALLBACK'], REJECTED: ['SUPERVISOR', 'FALLBACK'], CANCELLED: ['TRAINER'] },
  APPROVED: { CANCELLED: ['TRAINER'], REVOKED: ['SUPERVISOR'] },
}

export function canTransition(from: RequestStatus, to: RequestStatus, actorRole: ActorRole): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actorRole) ?? false
}
```

### TZDate implementation

Use native `Intl.DateTimeFormat` to determine the Europe/Zurich UTC offset at the target date, then compute the UTC instant for midnight local time. Month is 0-indexed (same as `new Date()`). The `tz` parameter is accepted but always assumed to be `'Europe/Zurich'`.

```ts
const ZURICH_TZ = 'Europe/Zurich'

export function TZDate(year: number, month: number, day: number, _tz: string = ZURICH_TZ): Date {
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  // Probe at noon UTC to determine Zurich offset for this calendar date
  const probeUTC = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`)
  const zurichHourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: ZURICH_TZ,
    hour: '2-digit',
    hour12: false,
  }).format(probeUTC)
  const zurichHour = parseInt(zurichHourStr, 10)
  const offsetHours = zurichHour - 12 // e.g. 13 → +1 (CET), 14 → +2 (CEST)
  // Midnight local = midnight UTC minus offset
  const midnightUTC = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`)
  midnightUTC.setUTCHours(-offsetHours)
  return midnightUTC
}
```

### formatDate implementation

```ts
export function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZURICH_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}`
}
```

### workingDaysBetween implementation

Iterates calendar days from `from` (inclusive) to `to` (exclusive), counting Mon–Fri. No public-holiday logic.

```ts
export function workingDaysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const start = new Date(from); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(to); end.setUTCHours(0, 0, 0, 0)
  let count = 0
  const cur = new Date(start)
  while (cur < end) {
    const dow = cur.getUTCDay() // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) count++
    cur.setTime(cur.getTime() + MS_PER_DAY)
  }
  return count
}
```

### countDaysInYear helper (internal to balance service)

The `endDate` stored in the DB is the last day of vacation (inclusive). Add 1 day to make it exclusive before year-boundary clamping:

```ts
const MS_PER_DAY = 24 * 60 * 60 * 1000

function countDaysInYear(startDate: Date, endDate: Date, year: number): number {
  const yearStart = TZDate(year, 0, 1)
  const yearEnd = TZDate(year + 1, 0, 1)
  const endExclusive = new Date(endDate.getTime() + MS_PER_DAY)
  const effStart = startDate < yearStart ? yearStart : startDate
  const effEnd = endExclusive > yearEnd ? yearEnd : endExclusive
  if (effStart >= effEnd) return 0
  return Math.round((effEnd.getTime() - effStart.getTime()) / MS_PER_DAY)
}
```

### Balance service carry-over calculation

- `carryOverExpiresAt = TZDate(year, 2, 1)` — March 1, midnight Zurich (month 2 = March in 0-indexed)
- `carryOverExpired = new Date() >= carryOverExpiresAt`
- To compute carry-over: fetch entitlement for `year - 1`, fetch APPROVED requests with days in `year - 1`, compute `max(0, entitlement[year-1] - approvedDaysInYearN1)`
- Only APPROVED (not PENDING) requests count as consumed from the previous year — PENDING from last year don't reduce carry-over (they may be rejected)

### Test mocking pattern (consistent with existing tests)

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn() },
    entitlement: { findUnique: vi.fn() },
    vacationRequest: { findMany: vi.fn() },
  },
}))
```

Use `vi.fn()` (Vitest). Import mock after `vi.mock()`. Cast with `as unknown as { ... }` pattern from existing service tests.

### Prisma AuditLog field names

From the schema: `actorId`, `action`, `entityType`, `entityId`, `timestamp`, `metadata` (Json). No `createdAt` or `updatedAt` — by design (append-only).

### References

- [Source: architecture.md#State Machine] — TRANSITIONS table structure, canTransition pattern
- [Source: architecture.md#Data Architecture] — balance computed dynamically, no snapshot
- [Source: architecture.md#Format Patterns] — date display format "Mon 14 Jul 2026", Europe/Zurich
- [Source: prd.md#4] — balance formula, carry-over, entitlement
- [Source: prd.md#3.5] — cross-year request splits
- [Source: prisma/schema.prisma] — AuditLog, VacationRequest, Entitlement models
- [Source: src/generated/prisma/enums.ts] — RequestStatus, Role enums

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/lib/request-state-machine.ts`: TRANSITIONS table + `canTransition` — all 6 valid transition rules, terminal states blocked, ActorRole includes FALLBACK
- `src/lib/request-state-machine.test.ts`: 16 tests — all transitions, role enforcement, terminal states, unknown combos
- `src/lib/date.ts`: `TZDate` (Intl-based UTC offset detection), `formatDate` ("Mon 14 Jul 2026"), `workingDaysBetween` (Mon–Fri counter)
- `src/lib/date.test.ts`: 9 tests — CET/CEST TZDate, policy dates (March 1, Feb 1), formatDate output, workingDaysBetween edge cases
- `src/lib/services/audit.service.ts`: `log()` with `Prisma.InputJsonValue` cast for metadata field
- `src/lib/services/audit.service.test.ts`: 3 tests — correct field shape, timestamp present, no update/delete
- `src/lib/services/vacation-balance.service.ts`: `computeBalance` with `countDaysInYear` helper; carry-over expiry; cross-year splits; pending vs taken distinction
- `src/lib/services/vacation-balance.service.test.ts`: 8 tests covering zeros, pending, taken, carry-over, cross-year
- 176 tests total, all pass; TypeScript clean

### File List

- src/lib/request-state-machine.ts (created)
- src/lib/request-state-machine.test.ts (created)
- src/lib/date.ts (created)
- src/lib/date.test.ts (created)
- src/lib/services/audit.service.ts (created)
- src/lib/services/audit.service.test.ts (created)
- src/lib/services/vacation-balance.service.ts (created)
- src/lib/services/vacation-balance.service.test.ts (created)

### Change Log

- 2026-06-18: Story 3.1 implemented — state machine, date utils, balance service, audit service; 45 new tests (176 total pass)
