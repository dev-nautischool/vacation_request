---
story_key: 4-3-set-and-manage-trainer-entitlement
epic: 4
story: 3
baseline_commit: cfc63e91c88d616fc953358aa46816ea50b8d2eb
---

# Story 4.3: Set & Manage Trainer Entitlement

Status: done

## Story

As a supervisor,
I want to set and edit a trainer's annual vacation entitlement within the 10-day grace period,
So that each trainer has the correct number of days allocated for the year.

## Acceptance Criteria

1. **Given** a supervisor opens a trainer's detail page at `/trainers/:id`
   **When** no entitlement has been set for the current year
   **Then** an editable entitlement field is shown with a Save button

2. **Given** a supervisor saves an entitlement value
   **When** the `setEntitlement` Server Action runs
   **Then** an `entitlements` record is created (or updated within grace period) for that trainer and year
   **And** an audit log entry is written
   **And** a toast confirms: "Entitlement saved."

3. **Given** the entitlement was set within the last 10 days
   **When** the trainer detail page loads
   **Then** the entitlement field is editable and shows the remaining days in the grace window

4. **Given** more than 10 days have passed since the entitlement was first set
   **When** the trainer detail page loads
   **Then** the entitlement field is read-only with a locked indicator and tooltip: "Entitlement locked after 10-day edit window"

5. **Given** a supervisor attempts to save an entitlement after the grace period via a direct Server Action call
   **When** `entitlement.service.ts` validates the request
   **Then** it returns `ActionResult` error with code `ENTITLEMENT_LOCKED`

6. **Given** an entitlement is set or updated
   **When** the trainer views their balance card
   **Then** the fresh entitlement figure reflects the new value immediately (balance is computed from records — no cache)

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/services/entitlement.service.ts` — grace period enforcement (AC: 2, 5)
  - [x] `setEntitlement(supervisorId, trainerId, year, days)`: verify trainer belongs to supervisor; check existing entitlement and grace period (10 calendar days from `createdAt`); upsert; `auditService.log`; return `ActionResult<void>`
  - [x] `getEntitlementStatus(trainerId, year)`: returns `{ days: number | null, isLocked: boolean, graceDaysRemaining: number | null }`

- [x] Task 2: Create `src/lib/actions/entitlements.ts` — Server Action (AC: 2)
  - [x] `setEntitlement(prevState, formData)`: verify SUPERVISOR session; extract `trainerId`, `year`, `days` from formData; validate `days` is positive integer; call service; `revalidatePath`; return `ActionResult<void>`

- [x] Task 3: Create `src/app/(authenticated)/trainers/[id]/page.tsx` — trainer detail (AC: 1, 3, 4)
  - [x] Server component; SUPERVISOR-only (proxy guards `/trainers`)
  - [x] Load trainer; verify actor has scope (direct supervisor or fallback)
  - [x] Load `getEntitlementStatus` and `computeBalance` in parallel
  - [x] Render `<BalanceCard>` and `<EntitlementForm>`

- [x] Task 4: Create `src/app/(authenticated)/trainers/loading.tsx` — skeleton (AC: 1)
  - [x] Two `<Skeleton variant="card" />` instances for balance and entitlement sections

- [x] Task 5: Create `src/components/features/trainers/EntitlementForm.tsx` (AC: 1, 3, 4)
  - [x] Client component; editable when `!isLocked`, read-only with "Locked" badge when locked
  - [x] Wired to `setEntitlement` action via `useActionState`
  - [x] Toast on success/error

- [x] Task 6: Write tests `src/lib/services/entitlement.service.test.ts` (AC: 2, 5)
  - [x] Create: sets entitlement for trainer, writes audit log
  - [x] Update within grace period: updates existing record
  - [x] ENTITLEMENT_LOCKED: returns error when > 10 days since first set
  - [x] UNAUTHORIZED: returns error when trainer does not belong to supervisor

## Dev Notes

### Grace period logic

Grace period is 10 calendar days (not working days) from the `createdAt` timestamp of the entitlement record:

```ts
const MAX_ENTITLEMENT_EDIT_DAYS = 10

export async function setEntitlement(
  supervisorId: string,
  trainerId: string,
  year: number,
  days: number,
): Promise<ActionResult<void>> {
  // Ownership check
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId, deletedAt: null },
    select: { supervisorId: true },
  })
  if (!trainer || trainer.supervisorId !== supervisorId) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const existing = await prisma.entitlement.findUnique({
    where: { trainerId_year: { trainerId, year } },
    select: { id: true, createdAt: true },
  })

  if (existing) {
    const daysSinceCreated = Math.floor(
      (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysSinceCreated > MAX_ENTITLEMENT_EDIT_DAYS) {
      return { success: false, error: "Entitlement locked", code: ERRORS.ENTITLEMENT_LOCKED }
    }
    await prisma.entitlement.update({ where: { id: existing.id }, data: { days } })
    await auditService.log(supervisorId, "ENTITLEMENT_UPDATED", "Entitlement", existing.id, { year, days })
  } else {
    const rec = await prisma.entitlement.create({ data: { trainerId, year, days } })
    await auditService.log(supervisorId, "ENTITLEMENT_SET", "Entitlement", rec.id, { year, days })
  }

  return { success: true, data: undefined }
}
```

### EntitlementStatus type

Define in the service:

```ts
export interface EntitlementStatus {
  days: number | null
  isLocked: boolean
  graceDaysRemaining: number | null
}
```

### Entitlement form action wiring

```tsx
const [state, formAction, isPending] = useActionState(setEntitlementAction, null)
```

Pass `trainerId` and `year` as hidden inputs:
```tsx
<input type="hidden" name="trainerId" value={trainerId} />
<input type="hidden" name="year" value={year} />
<input name="days" type="number" min="1" max="365" defaultValue={status.days ?? ""} />
```

### Ownership check for detail page

On the server page, after loading the trainer by `params.id`, verify:
```ts
if (trainer.supervisorId !== actorId) {
  // Also check fallback scope
  const fallbackIds = await getFallbackSupervisorIds(actorId)
  if (!fallbackIds.includes(trainer.supervisorId!)) {
    notFound() // from next/navigation
  }
}
```

### References

- [Source: epics.md#Story 4.3] — acceptance criteria
- [Source: architecture.md#Data Architecture] — Entitlement grace period, `entitlement.service.ts`
- [Source: prd.md#4.1] — 10-day grace period
- [Source: story 3-5] — `computeBalance`, `BalanceCard` usage

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- src/lib/services/entitlement.service.ts (new)
- src/lib/services/entitlement.service.test.ts (new)
- src/lib/actions/entitlements.ts (new)
- src/app/(authenticated)/trainers/[id]/page.tsx (new)
- src/app/(authenticated)/trainers/loading.tsx (new)
- src/components/features/trainers/EntitlementForm.tsx (new)

### Change Log

- 2026-06-18: Implemented Story 4.3 — entitlement service with grace period enforcement, Server Action, trainer detail page, EntitlementForm component (editable/locked); 8 service tests pass, 217 total
