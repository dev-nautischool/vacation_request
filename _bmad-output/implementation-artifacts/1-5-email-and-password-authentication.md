---
story_key: 1-5-email-and-password-authentication
epic: 1
story: 5
baseline_commit: 43c33246ce84ff6ddd8846d5492c330dd2299cfd
---

# Story 1.5: Email & Password Authentication

Status: review

## Story

As a club member,
I want to log in with my email and password and log out securely,
so that my account and data are protected.

## Acceptance Criteria

1. **Given** a user with a valid account  
   **When** they submit correct credentials  
   **Then** a database session is created with 30-day rolling expiry and they are redirected to `/dashboard`

2. **Given** a user submits incorrect credentials  
   **When** the login Server Action runs  
   **Then** it returns `ActionResult` error with code `UNAUTHORIZED` and the form shows "Invalid email or password" (does not reveal which field is wrong)

3. **Given** an authenticated user  
   **When** they log out  
   **Then** the database session is immediately invalidated and they are redirected to `/login`

4. **Given** a user account with `deleted_at` set  
   **When** they attempt to log in  
   **Then** authentication fails with `UNAUTHORIZED` and no session is created

## Tasks / Subtasks

- [x] Task 1: Create shared types and error codes (AC: 2, 4)
  - [x] Create `src/types/index.ts` with `ActionResult<T>` discriminated union type
  - [x] Create `src/lib/errors.ts` with all required error code constants

- [x] Task 2: Configure Better Auth (`src/lib/auth.ts`) (AC: 1, 3, 4)
  - [x] Import `prisma` from `@/lib/prisma`
  - [x] Import `prismaAdapter` from `better-auth/adapters/prisma`
  - [x] Import `nextCookies` from `better-auth/next-js`
  - [x] Configure `betterAuth` with `emailAndPassword: { enabled: true }`, `database: prismaAdapter(...)`, `session: { expiresIn: 2592000, updateAge: 86400 }` (30-day, rolling)
  - [x] Add `plugins: [nextCookies()]`
  - [x] Export `auth` and `Session`/`AuthUser` types inferred from auth

- [x] Task 3: Create Better Auth API route handler (AC: 1, 3)
  - [x] Create `src/app/api/auth/[...all]/route.ts`
  - [x] Import `toNextJsHandler` from `better-auth/next-js`
  - [x] Export `{ GET, POST }` from `toNextJsHandler(auth.handler)`

- [x] Task 4: Create auth Server Actions (`src/lib/actions/auth.ts`) (AC: 1, 2, 3, 4)
  - [x] `"use server"` directive at top of file
  - [x] `login(_prevState, formData)` returns `ActionResult<{ redirectTo: string }>`:
    - [x] Extract `email`, `password`, `returnTo` from formData
    - [x] Check `users` table where `deletedAt: null`; return UNAUTHORIZED if not found
    - [x] Call `auth.api.signInEmail({ body: { email, password }, headers })`
    - [x] Return success with safe redirectTo on success
    - [x] Catch and return UNAUTHORIZED on failure
  - [x] `logout(): Promise<void>` calls `auth.api.signOut` then redirects to `/login`

- [x] Task 5: Create login page (`src/app/login/page.tsx`) (AC: 1, 2)
  - [x] Server Component reads `searchParams` for `returnTo`
  - [x] Redirects to `/dashboard` if already authenticated
  - [x] Renders `<LoginForm returnTo={returnTo}>`

- [x] Task 6: Create LoginForm client component (`src/app/login/LoginForm.tsx`) (AC: 1, 2)
  - [x] `"use client"` directive
  - [x] `useActionState` with login action, initial state `null`
  - [x] Email + password inputs, hidden `returnTo` field, submit button
  - [x] Shows error message when `success === false`
  - [x] On success, calls `router.push(data.redirectTo)`

- [x] Task 7: Create stub dashboard page (`src/app/dashboard/page.tsx`) (AC: 1)
  - [x] Server Component checks session, redirects to `/login` if absent
  - [x] Shows user name and logout button

- [x] Task 8: Create Next.js middleware (`src/middleware.ts`) (AC: 1)
  - [x] Protects all routes except `/login` and `/api/auth/*`
  - [x] Redirects unauthenticated users to `/login?returnTo=<pathname>`

- [x] Task 9: Verify seed hash compatibility and update (AC: 1, 4)
  - [x] Discovered original seed used raw-bytes scrypt salt — incompatible with better-auth
  - [x] Updated `prisma/seed.ts` to use `hashPassword` from `better-auth/crypto`
  - [x] Verified: seeded account now verifies correctly with better-auth

- [x] Task 10: Write tests (AC: 1, 2, 3, 4)
  - [x] `src/types/index.test.ts` — ActionResult type tests (3 tests)
  - [x] `src/lib/errors.test.ts` — ERRORS constants tests (2 tests)
  - [x] `src/lib/actions/auth.test.ts` — login action tests (6 tests):
    - UNAUTHORIZED for missing user
    - UNAUTHORIZED for deleted user
    - UNAUTHORIZED when better-auth throws
    - Success with /dashboard redirect
    - Uses valid internal returnTo path
    - Rejects external returnTo (open-redirect prevention)

## Dev Notes

### CRITICAL: Skipped Stories 1.3 and 1.4

Stories 1.3 (Design Token System & UI Primitives) and 1.4 (Application Layout & Responsive Navigation Shell) are being skipped. This story uses minimal functional UI — no design system, no navigation shell.

### CRITICAL: Prisma v7.8.0 Import Paths

- Import from `@/generated/prisma/client` for types and PrismaClient
- Import from `@/generated/prisma/enums` for enum values
- NEVER use `from "@prisma/client"`
- NEVER call `new PrismaClient()` — always import `prisma` from `@/lib/prisma`

### Key Discovery: Seed Hash Incompatibility

The story 1.2 seed used `@noble/hashes/scrypt` synchronous API with raw-bytes salt:
```ts
const hash = scrypt(password, salt, { N: 16384, r: 16, p: 1, dkLen: 64 })
```

Better Auth's `hashPassword` passes the **hex-encoded salt string** to scryptAsync, not raw bytes. This makes the two hash formats incompatible even though they use the same parameters. Fix: use `hashPassword` from `better-auth/crypto` in the seed.

### Better Auth API Method Names

- Sign in: `auth.api.signInEmail` (NOT `signInEmailPassword`)
- Sign out: `auth.api.signOut`
- Get session: `auth.api.getSession({ headers })`

### useActionState Signature

`login` must accept `(_prevState, formData)` to work with `useActionState`. The cast needed for TypeScript:
```ts
useActionState<LoginResult, FormData>(
  login as (state: LoginResult, formData: FormData) => Promise<LoginResult>,
  null,
)
```

### References

- [Source: architecture.md#Authentication & Security]
- [Source: epics.md#Story 1.5]
- [Previous Story: 1-2-prisma-schema-and-database-initialization.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `auth.api.signInEmailPassword` does not exist — correct method is `auth.api.signInEmail`
- `useActionState` requires action signature `(prevState, formData)` — updated login action accordingly
- Seed hash format incompatible with better-auth: seed used raw-byte scrypt salt, better-auth uses hex-string salt — updated seed to use `hashPassword` from `better-auth/crypto`
- TypeScript error in test: `as ReturnType<typeof vi.fn>` requires `as unknown as` cast for better-auth's typed API

### Completion Notes List

- `src/types/index.ts`: `ActionResult<T>` discriminated union type
- `src/lib/errors.ts`: 7 error code constants (INVALID_TRANSITION, OVERLAP_CONFLICT, ENTITLEMENT_LOCKED, INSUFFICIENT_BALANCE, UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR)
- `src/lib/auth.ts`: Better Auth v1.3.4 configured with Prisma adapter, emailAndPassword, 30-day rolling sessions, nextCookies plugin
- `src/app/api/auth/[...all]/route.ts`: GET/POST handler via toNextJsHandler
- `src/lib/actions/auth.ts`: login (checks deletedAt, calls signInEmail, validates returnTo) and logout server actions
- `src/app/login/page.tsx`: server component with session check and returnTo handling
- `src/app/login/LoginForm.tsx`: client component with useActionState
- `src/app/dashboard/page.tsx`: stub dashboard with session guard and logout button
- `src/middleware.ts`: auth guard redirecting to /login?returnTo=<path>
- `prisma/seed.ts`: updated to use better-auth/crypto hashPassword for compatibility
- All 47 tests pass (12 test files). TypeScript clean.

### File List

- vacation-request/src/types/index.ts (created)
- vacation-request/src/types/index.test.ts (created)
- vacation-request/src/lib/errors.ts (created)
- vacation-request/src/lib/errors.test.ts (created)
- vacation-request/src/lib/auth.ts (created)
- vacation-request/src/lib/actions/auth.ts (created)
- vacation-request/src/lib/actions/auth.test.ts (modified — fixed TypeScript cast and action signature)
- vacation-request/src/app/api/auth/[...all]/route.ts (created)
- vacation-request/src/app/login/page.tsx (created)
- vacation-request/src/app/login/LoginForm.tsx (created)
- vacation-request/src/app/dashboard/page.tsx (created)
- vacation-request/src/middleware.ts (created)
- vacation-request/prisma/seed.ts (modified — updated to use better-auth/crypto hashPassword)

### Change Log

- 2026-06-17: Story 1.5 implemented — Better Auth config, login/logout actions, middleware, login page, stub dashboard, seed hash compatibility fix, 11 new tests (47 total pass)
