---
story_key: 3-3-save-and-manage-a-draft-request
epic: 3
story: 3
baseline_commit: 5c9d3472a7f0d9ad0b9e8172b0983be340f243e2
---

# Story 3.3: Save & Manage a Draft Request

Status: done

## Story

As a trainer,
I want to save a vacation request as a draft and return to it later,
So that I can prepare a request without committing to submitting it.

## Acceptance Criteria

1. **Given** a trainer is on the New Request page with dates selected  
   **When** they click "Save as Draft"  
   **Then** a `vacation_requests` record is created with status DRAFT  
   **And** a toast confirms: "Draft saved."  
   **And** a DraftCard appears on the trainer's Dashboard showing the saved dates and day count

2. **Given** a trainer views a DraftCard on their Dashboard  
   **When** they click "Continue"  
   **Then** the New Request form opens pre-filled with the saved draft dates

3. **Given** a trainer views a DraftCard on their Dashboard  
   **When** they click "Delete"  
   **Then** a confirmation modal asks "Delete this draft? This cannot be undone."  
   **And** on confirmation the draft record is deleted from the database  
   **And** the DraftCard is removed from the Dashboard

4. **Given** a trainer already has a DRAFT request  
   **When** they navigate to the New Request page  
   **Then** they are prompted to continue the existing draft or start fresh (two drafts are not created simultaneously)

## Tasks / Subtasks

- [ ] Task 1: Add `saveDraft` and `deleteDraft` to `src/lib/services/request.service.ts` (AC: 1, 3)
  - [ ] `saveDraft(trainerId: string, startDate: Date, endDate: Date, daysCount: number): Promise<ActionResult<{ id: string }>>` — checks for existing DRAFT (returns it if exists), otherwise creates new VacationRequest with status DRAFT; writes audit log
  - [ ] `deleteDraft(trainerId: string, draftId: string): Promise<ActionResult<void>>` — verifies the record belongs to trainerId and has status DRAFT; deletes the record (`prisma.vacationRequest.delete`)
  - [ ] `getDraft(trainerId: string): Promise<{ id, startDate, endDate, daysCount } | null>` — returns the trainer's current DRAFT request if any

- [ ] Task 2: Add `saveDraft` and `deleteDraft` Server Actions to `src/lib/actions/requests.ts` (AC: 1, 3)
  - [ ] `saveDraft`: guard auth + TRAINER role + `canActorPerformAction(actor, 'SAVE_DRAFT')`; parse FormData; delegate to service; `revalidatePath('/dashboard')`
  - [ ] `deleteDraft`: guard auth + TRAINER role; parse `draftId` from FormData; delegate to service; `revalidatePath('/dashboard')`

- [ ] Task 3: Create `src/components/features/requests/DraftCard.tsx` (AC: 1, 2, 3)
  - [ ] Client component; receives `draft: { id, startDate, endDate, daysCount }`, `onDeleted: () => void`
  - [ ] Shows formatted date range (`formatDate`) and day count
  - [ ] "Continue" button (outline): links to `/requests/new?draftId={id}` (pre-fills form)
  - [ ] "Delete" button (danger): opens `<Modal>` with confirmation text "Delete this draft? This cannot be undone."; on confirm calls `deleteDraft` action; on success calls `onDeleted()` and shows toast "Draft deleted."

- [ ] Task 4: Update `src/app/(authenticated)/dashboard/page.tsx` to fetch and show DraftCard (AC: 1, 2)
  - [ ] Fetch trainer's current draft via `requestService.getDraft(trainerId)`
  - [ ] If draft exists, render `<DraftCard>` below the submit button section
  - [ ] Dashboard already server-renders; draft data fetched at page level

- [ ] Task 5: Update `src/components/features/requests/RequestForm.tsx` to handle `draftId` query param (AC: 2, 4)
  - [ ] Read `draftId` from `searchParams` (passed as prop from the page)
  - [ ] If `draftId` provided: pre-fill DateRangePicker with draft's startDate/endDate and show "Continue draft" heading
  - [ ] If trainer has existing draft and `draftId` is not provided: show prompt "You have a saved draft. Continue it or start fresh?" with two buttons; "Continue" links to `?draftId={id}`, "Start Fresh" proceeds with empty form

- [ ] Task 6: Update `src/app/requests/new/page.tsx` to pass `searchParams` and draft to `RequestForm` (AC: 2, 4)
  - [ ] Accept `searchParams` prop; pass `draftId` to `<RequestForm>`
  - [ ] Fetch existing draft via `requestService.getDraft(trainerId)` to detect existing draft scenario

- [ ] Task 7: Add `saveDraft` and `deleteDraft` tests to `src/lib/services/request.service.test.ts` (AC: 1, 3)
  - [ ] `saveDraft`: creates DRAFT record when none exists; returns existing DRAFT if one already exists (no duplicate); writes audit log
  - [ ] `deleteDraft`: deletes record owned by trainer; returns NOT_FOUND if record doesn't exist or belongs to other trainer; returns error if status is not DRAFT

## Dev Notes

### saveDraft — idempotency rule

Only one DRAFT per trainer is allowed (AC4). `saveDraft` should:
1. Check for existing DRAFT: `prisma.vacationRequest.findFirst({ where: { trainerId, status: 'DRAFT' } })`
2. If exists: upsert (update dates) rather than create; return existing id
3. If not exists: create new DRAFT record

This prevents duplicate DRAFTs from race conditions or repeated "Save as Draft" clicks.

### deleteDraft — ownership check

Before deleting, verify:
```ts
const draft = await prisma.vacationRequest.findFirst({
  where: { id: draftId, trainerId, status: 'DRAFT' },
})
if (!draft) return { success: false, error: 'Not found', code: ERRORS.NOT_FOUND }
await prisma.vacationRequest.delete({ where: { id: draftId } })
```

Draft records are the one case where DELETE is used on `vacation_requests`. All non-DRAFT statuses must never be deleted (5-year retention). The guard `status: 'DRAFT'` enforces this.

### DraftCard dates display

Use `formatDate` from `@/lib/date` to format `startDate` and `endDate` in Zurich timezone. Show as "Mon 14 Jul 2026 – Wed 16 Jul 2026 (3 days)".

### Dashboard integration

The trainer dashboard (`/dashboard`) is currently a shared role-switched page. After this story it should show DraftCard when `draft !== null`. The DraftCard is a client component (has delete interaction) but the data fetching is server-side via the page RSC.

### RequestForm — draft pre-fill

When `draftId` is provided via `searchParams`:
- `RequestForm` receives `initialDraft: { startDate, endDate, daysCount } | null` from the page
- Initialize DateRangePicker state with these values so user sees pre-filled calendar

### Audit log for draft save

```ts
await auditService.log(trainerId, 'DRAFT_SAVED', 'VacationRequest', req.id, { startDate, endDate, daysCount })
```

### References

- [Source: epics.md#Story 3.3] — acceptance criteria
- [Source: prd.md#3.1] — DRAFT state, delete DRAFT is the only deletion allowed
- [Source: story 3-1] — `auditService.log` prerequisite
- [Source: story 3-2] — `requestService`, `RequestForm`, `/requests/new` are prerequisites
- [Source: architecture.md#Data Boundaries] — vacation_requests only deleted for DRAFT; all other statuses retained

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Change Log
