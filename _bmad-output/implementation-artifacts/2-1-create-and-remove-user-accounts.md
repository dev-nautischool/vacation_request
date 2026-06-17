---
story_key: 2-1-create-and-remove-user-accounts
epic: 2
story: 1
baseline_commit: b3092b1
---

# Story 2.1: Create & Remove User Accounts

Status: review

## Story

As a supervisor,
I want to create trainer and supervisor accounts and remove accounts that are no longer needed,
so that only current club members have access to the system.

## Acceptance Criteria

1. **Given** an authenticated supervisor on the Users page  
   **When** they submit the Create User form with a name, email, role (TRAINER or SUPERVISOR), and initial password  
   **Then** the user is created and appears in the user list  
   **And** the new user can log in with the provided credentials

2. **Given** a supervisor submits a Create User form with an email already in use  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `VALIDATION_ERROR` and the form shows "An account with this email already exists"

3. **Given** a supervisor removes a user account  
   **When** the Server Action runs  
   **Then** the user's `deletedAt` is set to the current timestamp (soft delete)  
   **And** the user no longer appears in any active user list  
   **And** the user's vacation records remain intact in the database

4. **Given** a soft-deleted user  
   **When** a supervisor inspects the user list  
   **Then** only users with `deletedAt IS NULL` are displayed

5. **Given** an authenticated TRAINER  
   **When** they attempt to access the Users page  
   **Then** they receive a 403 (already enforced by proxy.ts from Story 1.6 — no new middleware needed)

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/services/user.service.ts` with `createUser` and `removeUser` (AC: 1, 2, 3)
  - [x] `createUser(actorId, { name, email, role, password })` — creates User + Account records
  - [x] Check for existing non-deleted user with same email; return `VALIDATION_ERROR` if found
  - [x] Hash password with `hashPassword` from `better-auth/crypto` (same as seed.ts)
  - [x] Create `User` record with Prisma (role, emailVerified: true)
  - [x] Create `Account` record: `providerId: "credential"`, `accountId: email`, `password: hashedPassword`
  - [x] `removeUser(actorId, targetUserId)` — sets `deletedAt = new Date()` on user (soft delete)
  - [x] Validate actor is not removing themselves
  - [x] Return `ActionResult<User>` / `ActionResult<void>` shapes

- [x] Task 2: Create `src/lib/actions/users.ts` Server Actions (AC: 1, 2, 3)
  - [x] `createUser(prevState, formData)` — guard with `canActorPerformAction(actor, 'MANAGE_USERS')`
  - [x] `removeUser(prevState, formData)` — guard with `canActorPerformAction(actor, 'MANAGE_USERS')`
  - [x] Resolve session via `getSession()` from `@/lib/session`; return UNAUTHORIZED if no session
  - [x] Fetch actor role from DB (same pattern as layout.tsx); return UNAUTHORIZED if deleted
  - [x] Delegate to service; catch and map errors to `ActionResult` shape
  - [x] On success, call `revalidatePath('/users')` to refresh the user list

- [x] Task 3: Create Users page and components (AC: 1, 3, 4)
  - [x] `src/app/users/page.tsx` — RSC; fetch all non-deleted users; render `UserList` + `UserForm`
  - [x] `src/app/users/loading.tsx` — Skeleton matching user list/card dimensions (no spinners)
  - [x] `src/components/features/users/UserList.tsx` — table/list of users with role badge + remove button
  - [x] `src/components/features/users/UserForm.tsx` — create user form (name, email, role select, password)
  - [x] Use `useFormState`/`useActionState` for form state; show field-level error from `result.fields`
  - [x] Use `useFormStatus` for submit button pending state
  - [x] On remove click: show Modal confirmation before calling `removeUser` action
  - [x] Show Toast on success/error using ToastContext from layout

- [x] Task 4: Tests (AC: 1, 2, 3)
  - [x] `src/lib/services/user.service.test.ts` — unit tests with Prisma mock
    - [x] createUser: happy path (User + Account records created)
    - [x] createUser: duplicate email → VALIDATION_ERROR
    - [x] removeUser: sets deletedAt
    - [x] removeUser: self-removal blocked
  - [x] `src/lib/actions/users.test.ts` — unit tests mocking service
    - [x] UNAUTHORIZED when session missing
    - [x] UNAUTHORIZED when actor is TRAINER
    - [x] Delegates to service; maps result to ActionResult shape

## Dev Notes

### Critical: Password Creation Pattern

Creating a user requires both a `User` record and an `Account` record (Better Auth stores passwords in `accounts`). Use exactly the same pattern as `prisma/seed.ts`:

```ts
import { hashPassword } from "better-auth/crypto"

const hashedPassword = await hashPassword(password)

const user = await prisma.user.create({
  data: { name, email, role, emailVerified: true },
})

await prisma.account.create({
  data: {
    accountId: email,
    providerId: "credential",
    userId: user.id,
    password: hashedPassword,
  },
})
```

**Do NOT call `auth.api.createUser()` or `auth.api.signUpEmail()`.** Those are for self-registration flows. Supervisors create accounts via direct Prisma writes matching the seed pattern.

### Critical: Prisma Import

```ts
import { prisma } from "@/lib/prisma"       // always the singleton
import type { Role } from "@/generated/prisma/enums"  // NOT from @prisma/client
```

### Critical: RBAC Guard in Server Actions

```ts
import { canActorPerformAction } from "@/lib/rbac"
import { getSession } from "@/lib/session"
import { ERRORS } from "@/lib/errors"

export async function createUser(...) {
  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, deletedAt: true },
  })
  if (!actor || actor.deletedAt) return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }

  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "MANAGE_USERS")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }
  // ... delegate to service
}
```

### Critical: Soft Delete Filter

All queries for the user list must filter:
```ts
prisma.user.findMany({ where: { deletedAt: null } })
```

`deletedAt` is nullable (`DateTime? @map("deleted_at")`). Prisma accepts `null` as the filter value.

### Route Protection — Already Done

`/users` is already guarded by `src/proxy.ts` (Story 1.6) — TRAINER gets 403. No additional middleware changes needed.

### Email Uniqueness Check

Check for existing user by email **before** attempting create:
```ts
const existing = await prisma.user.findFirst({
  where: { email, deletedAt: null },
})
if (existing) return { success: false, error: "An account with this email already exists", code: ERRORS.VALIDATION_ERROR, fields: { email: "An account with this email already exists" } }
```

Note: a soft-deleted user's email is intentionally not blocked (they're inactive). Only check `deletedAt: null`.

### ActionResult Shape

```ts
// from src/types/index.ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; fields?: Record<string, string> }
```

Use `fields` for field-level validation errors so the form can highlight the specific input.

### Loading State Pattern

`src/app/users/loading.tsx` must use `Skeleton` component from `@/components/ui/Skeleton` — skeleton rows matching the user list card dimensions. No spinners (per architecture).

### UI Primitives Available

From `src/components/ui/` (all built in Story 1.3):
- `Button` — primary, outline, secondary, danger variants
- `Badge` — use for role display (TRAINER / SUPERVISOR)
- `Card` — wrap the form and list
- `Input` — floating label, 50px height
- `Modal` — for remove confirmation
- `Toast` / `useToast` — for success/error feedback
- `Skeleton` — for loading state

Import path: `@/components/ui` (barrel index exists at `src/components/ui/index.ts`).

### Page Data Fetch Pattern (RSC)

```tsx
// src/app/users/page.tsx
import { prisma } from "@/lib/prisma"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return (
    <>
      <UserForm />
      <UserList users={users} />
    </>
  )
}
```

RSC pages read directly from Prisma — no API route needed for reads.

### Form State Pattern

Use the same `useActionState`/`useFormStatus` pattern established across login form (Story 1.5):

```tsx
"use client"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { createUser } from "@/lib/actions/users"

function SubmitButton() {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create User"}</Button>
}

export function UserForm() {
  const [state, action] = useActionState(createUser, null)
  // ...
}
```

### Supervisor Cannot Remove Themselves

Block self-removal at the service layer:
```ts
if (actorId === targetUserId) {
  return { success: false, error: "Cannot remove your own account", code: ERRORS.VALIDATION_ERROR }
}
```

### Project Structure (files to create)

```
src/
  lib/
    services/
      user.service.ts          ← NEW
      user.service.test.ts     ← NEW
    actions/
      users.ts                 ← NEW
      users.test.ts            ← NEW
  app/
    users/
      page.tsx                 ← NEW (RSC)
      loading.tsx              ← NEW (skeleton)
  components/
    features/
      users/
        UserList.tsx           ← NEW
        UserForm.tsx           ← NEW
```

### References

- [Source: architecture.md#Naming Patterns] — Server Actions in `src/lib/actions/`, services in `src/lib/services/`
- [Source: architecture.md#Enforcement Guidelines] — always import prisma singleton, always return ActionResult
- [Source: architecture.md#Soft Deletes] — `deleted_at` field, never hard delete users
- [Source: epics.md#Story 2.1] — acceptance criteria and business rules
- [Source: prd.md#7] — user management owned by supervisors
- [Previous Story: 1-6-rbac-route-and-service-layer-enforcement.md] — canActorPerformAction usage, session→actor pattern
- [Previous Story: 1-5-email-and-password-authentication.md] — useActionState form pattern
- [Seed: prisma/seed.ts] — password hashing + Account creation pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/lib/services/user.service.ts`: `createUser` (User + Account records, hashPassword from better-auth/crypto, email uniqueness check) + `removeUser` (soft-delete via deletedAt, self-removal guard, NOT_FOUND guard)
- `src/lib/actions/users.ts`: `createUser` + `removeUser` Server Actions — session resolved via `getSession()`, actor fetched from DB, `canActorPerformAction('MANAGE_USERS')` guard, delegates to service, `revalidatePath('/users')` on success
- `src/app/users/page.tsx`: RSC fetching non-deleted users ordered by createdAt, rendering UserForm + UserList in responsive grid
- `src/app/users/loading.tsx`: Skeleton-based loading state (no spinners)
- `src/components/features/users/UserForm.tsx`: Client form using `useActionState` + `useFormStatus`, field-level error display, toast on success/error
- `src/components/features/users/UserList.tsx`: Table with role display + per-row RemoveUserButton using `useActionState` + Modal confirmation
- All 104 tests pass; 15 new tests added across service and action layers; TypeScript clean

### Change Log

- 2026-06-17: Story 2.1 implemented — user service (createUser + removeUser), Server Actions, Users page RSC, UserForm + UserList client components, 15 new tests (104 total pass), TypeScript clean

### File List

- src/lib/services/user.service.ts (created)
- src/lib/services/user.service.test.ts (created)
- src/lib/actions/users.ts (created)
- src/lib/actions/users.test.ts (created)
- src/app/users/page.tsx (created)
- src/app/users/loading.tsx (created)
- src/components/features/users/UserForm.tsx (created)
- src/components/features/users/UserList.tsx (created)
