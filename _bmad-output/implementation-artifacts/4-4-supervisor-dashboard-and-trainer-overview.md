---
story_key: 4-4-supervisor-dashboard-and-trainer-overview
epic: 4
story: 4
baseline_commit: cfc63e91c88d616fc953358aa46816ea50b8d2eb
---

# Story 4.4: Supervisor Dashboard & Trainer Overview

Status: done

## Story

As a supervisor,
I want a dashboard showing all my trainers' balances and a preview of pending requests,
So that I can quickly assess team availability and action any waiting decisions.

## Acceptance Criteria

1. **Given** an authenticated supervisor on the Dashboard
   **When** the page loads
   **Then** a grid of TrainerSummaryCards is displayed, one per assigned trainer, each showing: trainer name, BalanceBar (remaining/total), and a pending request count badge (red if > 0)

2. **Given** a supervisor clicks a TrainerSummaryCard
   **When** navigating to `/trainers/:id`
   **Then** the trainer's full balance card, entitlement form, and request history are shown

3. **Given** a supervisor's dashboard with pending requests
   **When** the page loads
   **Then** a pending queue section shows up to the first 3 PENDING requests with a link to the full Approvals page

4. **Given** a supervisor's approval queue at `/approvals`
   **When** there are no pending requests
   **Then** the empty state reads: "No pending requests. Your trainers are all set."

5. **Given** the dashboard is loading
   **When** data is being fetched
   **Then** skeleton cards matching TrainerSummaryCard dimensions are shown — no spinner

## Tasks / Subtasks

- [x] Task 1: Create `src/app/(authenticated)/trainers/page.tsx` — trainer list page (AC: 2)
  - [x] Server component; loads trainers by `supervisorId`; computes balance + pending count per trainer
  - [x] Renders `<TrainerList trainers={...} />`

- [x] Task 2: Update `src/app/(authenticated)/dashboard/page.tsx` — supervisor branch (AC: 1, 3)
  - [x] Added supervisor branch loading trainers, pending preview (first 3), and TrainerList grid
  - [x] Pending queue shows trainer name + date range + link to `/approvals/{id}`, with "View all" link

- [x] Task 3: Create `src/components/features/trainers/TrainerSummaryCard.tsx` (AC: 1, 2)
  - [x] Links to `/trainers/{id}`; shows avatar initial, trainer name, BalanceBar, pending badge (red when > 0)

- [x] Task 4: Create `src/components/features/trainers/TrainerList.tsx` (AC: 1)
  - [x] Responsive grid; empty state: "No trainers assigned."

- [x] Task 5: `ApprovalQueue` empty state already correct from Story 4-1 (AC: 4)

- [x] Task 6: Dashboard loading.tsx already has skeleton; no change needed (AC: 5)

- [x] Task 7: Write component tests `src/components/features/trainers/TrainerSummaryCard.test.tsx` (AC: 1)
  - [x] Renders trainer name; shows badge when pendingCount > 0; no badge when 0; links to correct href

## Dev Notes

### TrainerSummaryData shape

Define in the component or in `src/types/index.ts`:

```ts
export interface TrainerSummaryData {
  id: string
  name: string
  balance: BalanceSnapshot
  pendingCount: number
}
```

### Loading data in dashboard for supervisor

```ts
const trainers = await prisma.user.findMany({
  where: { supervisorId: actorId, deletedAt: null, role: "TRAINER" },
  select: { id: true, name: true },
})

const trainerSummaries = await Promise.all(
  trainers.map(async (t) => {
    const balance = await computeBalance(t.id, new Date().getFullYear())
    const pendingCount = await prisma.vacationRequest.count({
      where: { trainerId: t.id, status: "PENDING" },
    })
    return { id: t.id, name: t.name, balance, pendingCount }
  }),
)
```

### Pending queue preview (first 3)

```ts
const pendingPreview = await prisma.vacationRequest.findMany({
  where: { trainer: { supervisorId: actorId, deletedAt: null }, status: "PENDING" },
  include: { trainer: { select: { name: true } } },
  orderBy: { createdAt: "asc" },
  take: 3,
})
```

Render each as a compact row linking to `/approvals/{id}`, with a "View all" link to `/approvals`.

### Avatar initial

```tsx
const initial = trainerName.charAt(0).toUpperCase()
// Render:
<div className="w-10 h-10 bg-[var(--color-brand-primary)] text-white flex items-center justify-center font-bold text-lg">
  {initial}
</div>
```

### Skeleton cards

Use the existing `<Skeleton>` component. For TrainerSummaryCard-sized skeletons, use a `variant="card"` or a fixed-height div:

```tsx
<div className="h-32 border border-[var(--color-border)] animate-pulse bg-[var(--color-surface)]" />
```

### Dashboard page branching

The existing `dashboard/page.tsx` already has `const isTrainer = user?.role === "TRAINER"`. Add:

```tsx
const isSupervisor = user?.role === "SUPERVISOR"
// ...
{isSupervisor && (
  <>
    <TrainerList trainers={trainerSummaries} />
    {/* pending queue section */}
  </>
)}
```

### References

- [Source: epics.md#Story 4.4] — acceptance criteria
- [Source: DESIGN.md] — card, grid, badge styling
- [Source: story 3-5] — `computeBalance`, `BalanceBar` component
- [Source: story 4-1] — pending queue scope, `ApprovalQueue` empty state

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- src/app/(authenticated)/trainers/page.tsx (new)
- src/app/(authenticated)/dashboard/page.tsx (modified — supervisor branch added)
- src/components/features/trainers/TrainerSummaryCard.tsx (new)
- src/components/features/trainers/TrainerSummaryCard.test.tsx (new)
- src/components/features/trainers/TrainerList.tsx (new)

### Change Log

- 2026-06-18: Implemented Story 4.4 — supervisor dashboard with trainer grid + pending preview, TrainerList and TrainerSummaryCard components; 4 component tests pass, 221 total
