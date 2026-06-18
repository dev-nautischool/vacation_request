---
story_key: 3-5-vacation-balance-display-and-trainer-dashboard
epic: 3
story: 5
baseline_commit: 5c9d3472a7f0d9ad0b9e8172b0983be340f243e2
---

# Story 3.5: Vacation Balance Display & Trainer Dashboard

Status: done

## Story

As a trainer,
I want to see my current vacation balance and all its components on my dashboard,
So that I always know how many days I have available, pending, and taken.

## Acceptance Criteria

1. **Given** an authenticated trainer on the Dashboard  
   **When** the page loads  
   **Then** a BalanceCard displays: fresh entitlement, carry-over (with "Expires March 1" label in carry-over accent color), pending days, taken days, and remaining days

2. **Given** the trainer has carry-over days that have expired (past March 1)  
   **When** the BalanceCard is displayed  
   **Then** carry-over shows 0 and the remaining balance reflects only the fresh entitlement

3. **Given** the BalanceCard  
   **When** rendered  
   **Then** a BalanceBar shows the remaining/total ratio as a visual fill bar

4. **Given** a trainer has no requests and no entitlement set  
   **When** the Dashboard loads  
   **Then** an empty state message is shown: "Nothing planned yet. Ready to request time off?" with a Submit Request primary button

5. **Given** the trainer has a saved DRAFT  
   **When** the Dashboard loads  
   **Then** the DraftCard appears below the submit button showing saved dates and day count

## Tasks / Subtasks

- [ ] Task 1: Create `src/components/features/balance/BalanceBar.tsx` (AC: 3)
  - [ ] Client component; props: `remaining: number`, `total: number`
  - [ ] Visual fill bar: width = `(remaining / total) * 100%`, clamped to [0, 100]
  - [ ] Bar color: `bg-[--color-primary]`; background track: `bg-[--color-border]`
  - [ ] Height: 8px; no border-radius (sharp corners per design system)
  - [ ] If `total === 0`, show empty bar (0%)

- [ ] Task 2: Create `src/components/features/balance/BalanceCard.tsx` (AC: 1, 2, 3)
  - [ ] Server component (receives pre-fetched `BalanceSnapshot` as prop)
  - [ ] Props: `balance: BalanceSnapshot` (imported from `@/lib/services/vacation-balance.service`)
  - [ ] Layout: labeled rows for each balance component using DESIGN.md tokens
  - [ ] Carry-over row: show value in `--color-carry-over` color (#14a5eb); show expiry date "Expires March 1" if `carryOverExpiresAt` is set and not expired; if `carryOverExpired` show "Carry-over expired" in muted color
  - [ ] Remaining row: show `balance.remaining` prominently
  - [ ] Include `<BalanceBar remaining={balance.remaining} total={balance.freshEntitlement + balance.carryOver} />`

- [ ] Task 3: Update `src/app/(authenticated)/dashboard/page.tsx` — trainer dashboard view (AC: 1–5)
  - [ ] The dashboard is role-switched: show trainer view for TRAINER, redirect/show supervisor view for SUPERVISOR
  - [ ] For TRAINER: fetch `computeBalance(trainerId, currentYear)` where `currentYear = new Date().getFullYear()` (note: the page can use bare `new Date()` for the current year query — business logic uses TZDate internally)
  - [ ] Fetch `requestService.getDraft(trainerId)` for DraftCard
  - [ ] Render `<BalanceCard balance={balance} />`
  - [ ] If `balance.freshEntitlement === 0 && balance.pending === 0 && balance.taken === 0`: show empty state with "Nothing planned yet. Ready to request time off?" + Submit Request `<Button variant="primary">` linking to `/requests/new`
  - [ ] Else: show balance card + any pending/approved requests summary
  - [ ] If `draft !== null`: render `<DraftCard>` below submit button

- [ ] Task 4: Create `src/app/(authenticated)/dashboard/loading.tsx` — skeleton loading state (AC: 1)
  - [ ] `<Skeleton variant="card" />` matching BalanceCard dimensions; no spinner

- [ ] Task 5: Create `src/components/features/balance/BalanceCard.test.tsx` (AC: 1, 2, 3)
  - [ ] Renders all balance fields: fresh entitlement, carry-over, pending, taken, remaining
  - [ ] Carry-over expired: shows 0 carry-over and no expiry date
  - [ ] Active carry-over: shows expiry date label in carry-over accent color
  - [ ] Renders BalanceBar with correct proportions

## Dev Notes

### BalanceCard layout (DESIGN.md)

Use `<Card>` primitive (flat, 1px border, 0 radius). Inside, a grid of labeled rows:

```
Fresh Entitlement    20 days
Carry-over           5 days  (Expires March 1)   ← in --color-carry-over
Pending              3 days
Taken                2 days
──────────────────────────────
Remaining           20 days

[BalanceBar]
```

Labels use `font-heading` Montserrat uppercase. Values use Roboto body.

### Carry-over color

```tsx
<span className="text-[--color-carry-over]">{balance.carryOver} days</span>
{balance.carryOverExpiresAt && !balance.carryOverExpired && (
  <span className="text-[--color-carry-over] text-sm">
    Expires {formatDate(balance.carryOverExpiresAt)}
  </span>
)}
```

### Dashboard role switching

The `(authenticated)/dashboard/page.tsx` currently renders a basic placeholder. After this story:
1. Get user role from session
2. If TRAINER: render trainer dashboard (balance + draft + empty state)
3. If SUPERVISOR: render placeholder or redirect to supervisor dashboard (full supervisor dashboard built in Epic 4)

For now, show a "Supervisor Dashboard coming soon" card for SUPERVISOR to avoid blocking.

### currentYear for balance

```ts
// In dashboard page.tsx (RSC):
const now = new Date()
const currentYear = now.getFullYear()
// This is OK — we're just getting the year integer, not using Date for business logic
const balance = await computeBalance(trainerId, currentYear)
```

The `computeBalance` function internally uses `TZDate` for all policy date comparisons.

### Empty state condition

The condition "has no requests and no entitlement" should be interpreted as: fresh entitlement is 0 AND pending + taken = 0. This means no entitlement has been set by their supervisor yet. Show the "Nothing planned yet" empty state in this case.

### BalanceBar visual spec

```tsx
<div className="h-2 bg-[--color-border] w-full">
  <div
    className="h-2 bg-[--color-primary] transition-all"
    style={{ width: `${Math.min(100, total > 0 ? (remaining / total) * 100 : 0)}%` }}
  />
</div>
```

### References

- [Source: epics.md#Story 3.5] — acceptance criteria
- [Source: prd.md#4.3] — balance display fields and formula
- [Source: DESIGN.md#Colors] — carry-over accent #14a5eb, primary #e5222d
- [Source: story 3-1] — `computeBalance`, `BalanceSnapshot` type prerequisite
- [Source: story 3-3] — `getDraft`, `DraftCard` prerequisite
- [Source: architecture.md#Frontend Architecture] — RSC for data, client for interaction

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Change Log
