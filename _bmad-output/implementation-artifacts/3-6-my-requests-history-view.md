---
story_key: 3-6-my-requests-history-view
epic: 3
story: 6
baseline_commit: 5c9d3472a7f0d9ad0b9e8172b0983be340f243e2
---

# Story 3.6: My Requests History View

Status: done

## Story

As a trainer,
I want to view the full history of my vacation requests with their statuses and details,
So that I have a complete record of all requests I have made.

## Acceptance Criteria

1. **Given** an authenticated trainer on the My Requests page  
   **When** the page loads  
   **Then** all their requests are displayed in a table: date range, day count, status badge, submission date, and a cancel action (visible only for PENDING or APPROVED)

2. **Given** the requests table on a mobile viewport  
   **When** it renders  
   **Then** the table is horizontally scrollable with the first column (dates) sticky

3. **Given** a request with status REJECTED or REVOKED  
   **When** displayed in the history  
   **Then** the rejection/revocation reason is shown inline below the row

4. **Given** the trainer has no requests  
   **When** the My Requests page loads  
   **Then** an empty state is shown: "No requests yet."

5. **Given** the page is loading data  
   **When** the skeleton loading state is active  
   **Then** skeleton rows are displayed matching the dimensions of a fully loaded table row — no spinner

## Tasks / Subtasks

- [ ] Task 1: Create `src/app/requests/page.tsx` — My Requests page (AC: 1–5)
  - [ ] Server component; authenticate and verify TRAINER role (middleware handles 403 for supervisors)
  - [ ] Fetch all requests for trainer: `prisma.vacationRequest.findMany({ where: { trainerId }, orderBy: { createdAt: 'desc' } })`
  - [ ] Pass to `<RequestHistory requests={requests} />`

- [ ] Task 2: Create `src/app/requests/loading.tsx` — skeleton loading state (AC: 5)
  - [ ] Render 3–4 `<Skeleton variant="table-row" />` instances; no spinner

- [ ] Task 3: Create `src/components/features/requests/RequestHistory.tsx` (AC: 1–5)
  - [ ] Client component (needs cancel interaction)
  - [ ] Props: `requests: VacationRequest[]`
  - [ ] Empty state: if `requests.length === 0`, show "No requests yet." paragraph
  - [ ] Table columns: Date Range | Days | Status | Submitted | Action
  - [ ] Date range: `{formatDate(startDate)} – {formatDate(endDate)}`
  - [ ] Status: `<Badge status={request.status} />`
  - [ ] Submitted: `formatDate(createdAt)`
  - [ ] Action: "Cancel Request" button (danger outline) only for PENDING and APPROVED — triggers cancel modal (from story 3-4)
  - [ ] REJECTED/REVOKED rows: show `request.reason` in a sub-row below with muted text style
  - [ ] Mobile: `overflow-x-auto` wrapper; first column (dates) `sticky left-0 bg-white` z-index

- [ ] Task 4: Create `src/components/features/requests/RequestHistory.test.tsx` (AC: 1, 3, 4)
  - [ ] Empty state: renders "No requests yet." when no requests
  - [ ] PENDING row: shows cancel button
  - [ ] APPROVED row: shows cancel button
  - [ ] REJECTED row: shows reason below; no cancel button
  - [ ] REVOKED row: shows reason below; no cancel button
  - [ ] CANCELLED row: no cancel button; status badge shows CANCELLED

## Dev Notes

### VacationRequest type

Import from generated Prisma client:
```ts
import type { VacationRequest } from "@/generated/prisma/models/VacationRequest"
```

The `reason` field is `String?` (nullable) — only present for REJECTED and REVOKED statuses.

### Table markup

Use `<table>` element with `<thead>` and `<tbody>`. The responsive pattern:
```tsx
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="min-w-full">
    <thead>
      <tr>
        <th className="sticky left-0 bg-white z-10 ...">Dates</th>
        <th>Days</th>
        <th>Status</th>
        <th>Submitted</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {requests.map(req => (
        <>
          <tr key={req.id}>...</tr>
          {(req.status === 'REJECTED' || req.status === 'REVOKED') && req.reason && (
            <tr key={`${req.id}-reason`}>
              <td colSpan={5} className="text-[--color-text-body] text-sm pb-2 px-4">
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

### Cancel integration

The cancel modal from story 3-4 uses `<Modal>` component + `cancelRequest` Server Action. In `RequestHistory.tsx`:
- Track `cancellingId: string | null` state
- Show `<Modal>` when `cancellingId !== null`
- On confirm: call `cancelRequest` action with `cancellingId`; on success show toast + set `cancellingId` to null
- Use `useTransition` for pending state on the action call

### Badge usage

```tsx
import { Badge } from "@/components/ui"
<Badge status={request.status} />
```

The `Badge` component is already implemented for all 6 statuses.

### Skeleton rows

```tsx
// loading.tsx
import { Skeleton } from "@/components/ui"
export default function Loading() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  )
}
```

### Date formatting

All dates displayed via `formatDate()` from `@/lib/date`, which outputs "Mon 14 Jul 2026" in Europe/Zurich timezone.

### References

- [Source: epics.md#Story 3.6] — acceptance criteria
- [Source: prd.md#6.1] — trainer history view
- [Source: DESIGN.md] — Badge, table styling
- [Source: story 3-1] — `formatDate` utility
- [Source: story 3-4] — `cancelRequest` action and modal integration
- [Source: architecture.md#Frontend Architecture] — RSC page + client component for interactions

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Change Log
