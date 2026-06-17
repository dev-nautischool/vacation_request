---
story_key: 1-7-deep-link-authentication-returnto-flow
epic: 1
story: 7
baseline_commit: 94760762c698be1944096f0c53f1d765000a9be8
---

# Story 1.7: Deep-Link Authentication (returnTo Flow)

Status: done

## Story

As a supervisor,
I want email notification links to bring me directly to the target request after I authenticate,
So that I can act on requests without manually navigating to find them.

## Acceptance Criteria

1. **Given** an unauthenticated user who follows a link to `/approvals/abc123`  
   **When** they log in successfully  
   **Then** they are redirected to `/approvals/abc123`, not to `/dashboard`

2. **Given** the login Server Action processes a `returnTo` parameter  
   **When** the value starts with `http://` or `//`  
   **Then** it is rejected and the user is redirected to `/dashboard` instead (open-redirect prevention)

3. **Given** an authenticated user who clicks a deep link  
   **When** middleware processes the request  
   **Then** no `returnTo` redirect is applied — they go directly to the requested URL

## Tasks / Subtasks

- [x] Task 1: Verify proxy sets returnTo correctly and authenticated users pass through (AC: 1, 3)
  - [x] Confirm `src/proxy.ts` redirects to `/login?returnTo=<pathname>` for unauthenticated requests
  - [x] Confirm authenticated users (with session cookie) are passed through directly with no redirect
  - [x] Add targeted proxy test: unauthenticated deep link `/approvals/abc123` → redirect contains `returnTo=%2Fapprovals%2Fabc123`

- [x] Task 2: Verify login page passes returnTo from searchParams to form (AC: 1)
  - [x] Confirm `src/app/login/page.tsx` reads `returnTo` from searchParams and applies safety check
  - [x] Confirm `src/app/login/LoginForm.tsx` passes it as a hidden field to the form action

- [x] Task 3: Verify login action uses returnTo with open-redirect protection (AC: 1, 2)
  - [x] Confirm `src/lib/actions/auth.ts` login uses `safeRedirect` that validates returnTo starts with `/` and not `//`
  - [x] Confirm existing tests cover: valid internal path used, external URL rejected, `//`-prefixed URL rejected

## Dev Notes

### Context

This story's implementation was completed progressively across Stories 1.5 and 1.6:

- **Story 1.5** implemented the login action with `returnTo` form field, open-redirect guard, and `router.push(data.redirectTo)` in LoginForm.
- **Story 1.6** implemented `src/proxy.ts` which redirects unauthenticated requests to `/login?returnTo=<pathname>`, completing the full deep-link flow.

Story 1.7 tasks are verification + targeted test coverage to lock the behaviour as a documented AC.

### Full Deep-Link Flow

1. Unauthenticated user hits `/approvals/abc123`
2. `src/proxy.ts` redirects to `/login?returnTo=%2Fapprovals%2Fabc123`
3. `src/app/login/page.tsx` reads `searchParams.returnTo`, validates it starts with `/` and not `//`, passes safe value to `<LoginForm>`
4. `LoginForm` renders `<input type="hidden" name="returnTo" value={safeReturnTo} />`
5. On form submit, `login` action reads `returnTo` from formData, applies same guard, returns `{ redirectTo: '/approvals/abc123' }`
6. LoginForm's `useEffect` calls `router.push('/approvals/abc123')`

### Open-Redirect Prevention (two layers)

- Layer 1 (login page): `returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : ""`
- Layer 2 (login action): `returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard"`

### AC3 — Authenticated User

Authenticated users have `better-auth.session_token` cookie. The proxy sees it and calls `NextResponse.next()` immediately — no returnTo redirect applied.

### References

- [Source: architecture.md#Deep-Link Auth Flow]
- [Source: epics.md#Story 1.7]
- [Previous Story: 1-6-rbac-route-and-service-layer-enforcement.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 3 ACs were already satisfied by Stories 1.5 (login action + LoginForm returnTo) and 1.6 (proxy redirect with returnTo param)
- Added 1 targeted proxy test: unauthenticated `/approvals/abc123` → redirect contains `returnTo=%2Fapprovals%2Fabc123`
- Two-layer open-redirect prevention confirmed: login page sanitises searchParam, login action sanitises formData value
- All 91 tests pass (15 test files). TypeScript clean.

### File List

- vacation-request/src/proxy.test.ts (modified — added deep-link returnTo test)

### Change Log

- 2026-06-17: Story 1.7 verified — deep-link returnTo flow pre-implemented by Stories 1.5+1.6; added targeted proxy test for `/approvals/abc123` path preservation (91 tests pass)
