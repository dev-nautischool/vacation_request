---
story_key: 3-2-submit-a-vacation-request
epic: 3
story: 2
baseline_commit: 5c9d3472a7f0d9ad0b9e8172b0983be340f243e2
---

# Story 3.2: Submit a Vacation Request

Status: done

## Story

As a trainer,
I want to select a date range and submit a vacation request,
So that my supervisor is notified and can review it.

## Acceptance Criteria

1. **Given** an authenticated trainer on the New Request page  
   **When** they select a start and end date using the DateRangePicker  
   **Then** the day count updates live below the calendar  
   **And** any dates already covered by a PENDING or APPROVED request are grayed out and non-selectable

2. **Given** a trainer selects dates that overlap an existing PENDING or APPROVED request  
   **When** they attempt to proceed to the confirmation step  
   **Then** a toast appears: "These dates overlap an existing request. Choose different dates."  
   **And** the selection is cleared

3. **Given** a trainer selects valid, non-overlapping dates  
   **When** they proceed past the DateRangePicker  
   **Then** a ConfirmationPopup appears showing: selected dates, day count, and remaining balance after this request would be approved

4. **Given** a trainer confirms submission in the ConfirmationPopup  
   **When** the `submitRequest` Server Action runs  
   **Then** a `vacation_requests` record is created with status PENDING  
   **And** `canTransition(DRAFT, PENDING, 'TRAINER')` is called before the DB write  
   **And** an audit log entry is written for this action  
   **And** a toast confirms: "Request submitted. [Supervisor name] has been notified."

5. **Given** a trainer submits a request  
   **When** the page returns to the dashboard  
   **Then** the new request appears in the trainer's request history with status PENDING

## Tasks / Subtasks

- [ ] Task 1: Create `src/lib/services/request.service.ts` with overlap check (AC: 2, 4)
  - [ ] `getBlockedDateRanges(trainerId: string): Promise<{ startDate: Date; endDate: Date }[]>` — returns PENDING + APPROVED requests for UI calendar blocking
  - [ ] `checkOverlap(trainerId: string, startDate: Date, endDate: Date): Promise<boolean>` — returns true if proposed dates overlap any PENDING or APPROVED request (endDate inclusive: range overlaps if `start <= existingEnd AND end >= existingStart`)
  - [ ] `submitRequest(trainerId: string, startDate: Date, endDate: Date, daysCount: number): Promise<ActionResult<{ id: string }>>` — calls `canTransition(DRAFT, PENDING, 'TRAINER')`, checks overlap, creates VacationRequest with status PENDING, calls `auditService.log`

- [ ] Task 2: Create `src/lib/actions/requests.ts` — `submitRequest` Server Action (AC: 4)
  - [ ] `"use server"` directive
  - [ ] Get session via `getSession()`; return UNAUTHORIZED if not authenticated or not TRAINER
  - [ ] Call `canActorPerformAction(actor, 'SUBMIT_REQUEST')`; return UNAUTHORIZED if false
  - [ ] Parse `startDate`, `endDate`, `daysCount` from FormData
  - [ ] Validate dates are present and `endDate >= startDate`; return VALIDATION_ERROR if not
  - [ ] Delegate to `requestService.submitRequest(...)`
  - [ ] On success: `revalidatePath('/dashboard')`, `revalidatePath('/requests')`

- [ ] Task 3: Create `src/lib/services/request.service.test.ts` (AC: 2, 4)
  - [ ] `checkOverlap`: no conflict → false, exact overlap → true, adjacent dates → false, partial overlap → true
  - [ ] `submitRequest`: calls `canTransition`, creates record with PENDING status, calls `auditService.log`
  - [ ] `submitRequest` with overlap: returns OVERLAP_CONFLICT error, no DB write

- [ ] Task 4: Create `src/app/requests/new/page.tsx` — New Request page (AC: 1, 2, 3, 4, 5)
  - [ ] Server component; fetch blocked date ranges via `requestService.getBlockedDateRanges(trainerId)` and current balance via `computeBalance`
  - [ ] Render `<RequestForm>` passing blocked ranges and current balance as props

- [ ] Task 5: Create `src/app/requests/new/loading.tsx` — skeleton loading state
  - [ ] Use `<Skeleton>` card variant; no spinner

- [ ] Task 6: Create `src/components/features/requests/DateRangePicker.tsx` (AC: 1, 2)
  - [ ] Client component (`"use client"`)
  - [ ] Two-month calendar display; current month + next month
  - [ ] Tracks `startDate` and `endDate` state; clicking a date sets start if no start, or sets end if start is set (and end ≥ start), otherwise resets to new start
  - [ ] Grays out and blocks dates covered by `blockedRanges` prop
  - [ ] Shows live day count: `(endDate - startDate) / msPerDay + 1` days below calendar
  - [ ] On "Continue" (both dates selected): calls `onSelect(start, end, count)` callback
  - [ ] Props: `blockedRanges: { startDate: Date; endDate: Date }[]`, `onSelect: (start: Date, end: Date, count: number) => void`

- [ ] Task 7: Create `src/components/features/requests/ConfirmationPopup.tsx` (AC: 3, 4)
  - [ ] Client component; receives `startDate`, `endDate`, `daysCount`, `remainingAfter`, `supervisorName`, `onConfirm()`, `onBack()`
  - [ ] Displays dates in `formatDate()` format, day count, remaining balance after approval
  - [ ] "Confirm & Submit" button (primary) calls `onConfirm()`; "Back" button (secondary) calls `onBack()`

- [ ] Task 8: Create `src/components/features/requests/RequestForm.tsx` (AC: 1–5)
  - [ ] Client component; orchestrates DateRangePicker → ConfirmationPopup → submission flow
  - [ ] State: `step: 'pick' | 'confirm'`, `selection: { startDate, endDate, daysCount } | null`
  - [ ] On DateRangePicker `onSelect`: check overlap against `blockedRanges` prop; show toast if overlap; else advance to `'confirm'` step
  - [ ] On ConfirmationPopup `onConfirm`: call `submitRequest` Server Action via `startTransition`; show success toast with supervisor name; redirect to `/dashboard`
  - [ ] On ConfirmationPopup `onBack`: go back to `'pick'` step
  - [ ] Props: `blockedRanges`, `balance: BalanceSnapshot`, `supervisorName: string`

## Dev Notes

### Session retrieval

Use `getSession()` from `@/lib/session` (existing pattern from auth actions). The actor for TRAINER actions has `role: 'TRAINER'`.

### Overlap detection logic

A new request [A, B] overlaps an existing request [C, D] when: `A <= D AND B >= C`.
Both `startDate` and `endDate` in the DB are stored as UTC equivalents of Zurich midnight.

```ts
// In request.service.ts
const overlapping = await prisma.vacationRequest.findFirst({
  where: {
    trainerId,
    status: { in: ['PENDING', 'APPROVED'] },
    startDate: { lte: endDate },
    endDate: { gte: startDate },
  },
  select: { id: true },
})
return overlapping !== null
```

### submitRequest service flow

```ts
export async function submitRequest(
  trainerId: string,
  startDate: Date,
  endDate: Date,
  daysCount: number,
): Promise<ActionResult<{ id: string }>> {
  if (!canTransition('DRAFT', 'PENDING', 'TRAINER')) {
    return { success: false, error: 'Invalid transition', code: ERRORS.INVALID_TRANSITION }
  }
  const overlap = await checkOverlap(trainerId, startDate, endDate)
  if (overlap) {
    return { success: false, error: 'Overlap conflict', code: ERRORS.OVERLAP_CONFLICT }
  }
  const req = await prisma.vacationRequest.create({
    data: { trainerId, startDate, endDate, daysCount, status: 'PENDING' },
  })
  await auditService.log(trainerId, 'REQUEST_SUBMITTED', 'VacationRequest', req.id, {})
  return { success: true, data: { id: req.id } }
}
```

### DateRangePicker — calendar rendering

Render two months using `new Date(year, month, 1)` for each. For each day cell: check if the date is in any blocked range; if so, apply `opacity-50 cursor-not-allowed` and don't add click handler. Selected range: highlight start, end, and in-between days with `bg-[--color-primary] text-white`.

### ConfirmationPopup — remaining balance

`remainingAfter = balance.remaining - daysCount`. Display warning if `remainingAfter < 0`.

### Toast pattern

Import `useToast()` hook from `@/components/ui/Toast` (client-side). Show on overlap: `toast.error("These dates overlap an existing request. Choose different dates.")`. Show on success: `toast.success("Request submitted. ${supervisorName} has been notified.")`.

### Routing

`/requests/new` is a TRAINER-only route. The `proxy.ts` TRAINER_PATHS already protects `/requests/*`. Supervisors will get 403 (already enforced by existing middleware).

### File locations

- `src/app/requests/` — new route group for trainer requests
- `src/components/features/requests/` — all request-related components

### References

- [Source: epics.md#Story 3.2] — acceptance criteria
- [Source: architecture.md#Naming Patterns] — action naming: `submitRequest`
- [Source: architecture.md#Anti-Patterns] — never `new Date()` in business logic; use `TZDate`
- [Source: story 3-1] — `canTransition`, `computeBalance`, `auditService.log` are prerequisites
- [Source: prd.md#3.4] — overlap prevention rule

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Change Log
