---
story_key: 4-5-full-request-history-for-supervisors
epic: 4
story: 5
baseline_commit: cfc63e91c88d616fc953358aa46816ea50b8d2eb
---

# Story 4.5: Full Request History for Supervisors

Status: done

## Story

As a supervisor,
I want to view the complete request history for all my assigned trainers,
So that I have a full record for reference, auditing, and balance verification.

## Acceptance Criteria

1. **Given** an authenticated supervisor on `/trainers/:id`
   **When** the page loads
   **Then** all vacation requests for that trainer are listed: dates, day count, final status, submission date, and reason for REJECTED and REVOKED

2. **Given** a request with status REJECTED or REVOKED
   **When** displayed in the history
   **Then** the reason is shown inline below the row

3. **Given** the history table on mobile
   **When** it renders
   **Then** the table is horizontally scrollable with the dates column sticky

4. **Given** a trainer has no request history
   **When** the supervisor views their detail page
   **Then** a friendly empty state is shown: "No requests yet for this trainer."

5. **Given** timestamps are displayed
   **When** rendered
   **Then** they use the "Mon 14 Jul 2026" format in `Europe/Zurich` timezone

## Tasks / Subtasks

- [x] Task 1: Update `src/app/(authenticated)/trainers/[id]/page.tsx` — add request history data (AC: 1, 4)
  - [x] Fetch all requests in `Promise.all` alongside balance and entitlement; pass to `<TrainerRequestHistory>`

- [x] Task 2: Create `src/components/features/trainers/TrainerRequestHistory.tsx` (AC: 1–5)
  - [x] Read-only component; empty state: "No requests yet for this trainer."
  - [x] Table: Dates | Days | Status | Submitted; reason sub-row for REJECTED/REVOKED
  - [x] Mobile: `overflow-x-auto`, dates column sticky

- [x] Task 3: Write tests `src/components/features/trainers/TrainerRequestHistory.test.tsx` (AC: 1, 2, 4)
  - [x] Empty state; REJECTED shows reason; REVOKED shows reason; null reason omitted; APPROVED/CANCELLED no reason

## Dev Notes

### Table markup pattern

Reuse the same pattern as `RequestHistory.tsx` from Story 3-6:

```tsx
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="min-w-full">
    <thead>
      <tr>
        <th className="sticky left-0 bg-white z-10 ...">Dates</th>
        <th>Days</th>
        <th>Status</th>
        <th>Submitted</th>
      </tr>
    </thead>
    <tbody>
      {requests.map(req => (
        <>
          <tr key={req.id}>
            <td className="sticky left-0 bg-white z-10 ...">
              {formatDate(req.startDate)} – {formatDate(req.endDate)}
            </td>
            <td>{req.daysCount}</td>
            <td><Badge status={req.status} /></td>
            <td>{formatDate(req.createdAt)}</td>
          </tr>
          {(req.status === "REJECTED" || req.status === "REVOKED") && req.reason && (
            <tr key={`${req.id}-reason`}>
              <td colSpan={4} className="text-[var(--color-text-body)] text-sm pb-2 px-4">
                Reason: {req.reason}
              </td>
            </tr>
          )}
        </>
      ))}
    </tbody>
  </table>
</div>
```

### Component type

This component is read-only (no Server Actions, no interactivity) so it can be a plain server component or a plain client component — either works. Prefer a regular `.tsx` without `"use client"` unless interactivity is added.

### Imports

```ts
import type { VacationRequest } from "@/generated/prisma/models/VacationRequest"
import { Badge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/date"
```

### Integration in trainer detail page

After Task 1 of Story 4-3, the page already loads trainer + balance + entitlement. Add requests below:

```tsx
// In trainers/[id]/page.tsx
const requests = await prisma.vacationRequest.findMany({
  where: { trainerId },
  orderBy: { createdAt: "desc" },
})

// In JSX:
<TrainerRequestHistory requests={requests} />
```

### References

- [Source: epics.md#Story 4.5] — acceptance criteria
- [Source: story 3-6] — `RequestHistory.tsx` pattern (same table structure, different context)
- [Source: story 4-3] — `trainers/[id]/page.tsx` to extend

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- src/app/(authenticated)/trainers/[id]/page.tsx (modified — request history data + TrainerRequestHistory)
- src/components/features/trainers/TrainerRequestHistory.tsx (new)
- src/components/features/trainers/TrainerRequestHistory.test.tsx (new)

### Change Log

- 2026-06-18: Implemented Story 4.5 — TrainerRequestHistory component with sticky-column mobile table, reason sub-rows for REJECTED/REVOKED; 6 component tests pass, 227 total
