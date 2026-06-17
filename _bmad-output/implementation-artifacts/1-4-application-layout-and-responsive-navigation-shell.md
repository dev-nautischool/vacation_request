---
story_key: 1-4-application-layout-and-responsive-navigation-shell
epic: 1
story: 4
baseline_commit: 60e1ff2f4cd4cf3300c7cb12b108e2b4ceb04cfd
---

# Story 1.4: Application Layout & Responsive Navigation Shell

Status: review

## Story

As a logged-in user,
I want a consistent navigation shell on every authenticated page,
so that I can move between sections without losing context and always know where I am.

## Acceptance Criteria

1. **Given** an authenticated Trainer  
   **When** they view any protected page  
   **Then** the nav shows: Dashboard, My Requests, Notifications

2. **Given** an authenticated Supervisor  
   **When** they view any protected page  
   **Then** the nav shows: Dashboard, Approvals, Trainers, Users, Notifications

3. **Given** the desktop viewport (≥768px)  
   **When** any authenticated page renders  
   **Then** a top nav bar is shown with logo, nav links, user name, and Sign Out button

4. **Given** the mobile viewport (<768px)  
   **When** any authenticated page renders  
   **Then** a bottom tab bar is shown with nav item labels (no top nav)

5. **Given** the user is on a route matching a nav item  
   **When** the nav renders  
   **Then** that item is visually active (primary color text + border-bottom on desktop, primary color on mobile)

6. **Given** the `/login` page  
   **When** rendered  
   **Then** no navigation shell appears

7. **Given** any authenticated page  
   **When** rendered  
   **Then** the main content is constrained to max-width 1200px, centered, with 15px horizontal padding; on mobile a bottom padding offsets the fixed tab bar

## Tasks / Subtasks

- [x] Task 1: Create nav-items config helper (AC: 1, 2)
  - [x] Create `src/components/layout/nav-items.ts` with `NAV_ITEMS` array and `getNavItems(role)` filter function
  - [x] Write `src/components/layout/nav-items.test.ts` — 3 tests: TRAINER items, SUPERVISOR items, item order

- [x] Task 2: Create NavBar client component (AC: 3, 4, 5)
  - [x] Create `src/components/layout/NavBar.tsx` as `"use client"` using `usePathname()`
  - [x] Desktop: `<header>` with logo, nav links (border-b-2 active indicator), user name, Sign Out form
  - [x] Mobile: fixed `<nav>` bottom bar with tab items (primary color when active)

- [x] Task 3: Create PageShell component (AC: 7)
  - [x] Create `src/components/layout/PageShell.tsx` — max-w-[1200px], mx-auto, px-[15px], pb-[60px] md:pb-0

- [x] Task 4: Create authenticated route group layout (AC: 1, 2, 3, 4, 6)
  - [x] Create `src/app/(authenticated)/layout.tsx` — reads session + Prisma role, renders NavBar + PageShell + ToastProvider
  - [x] Redirect to `/login` if no session

- [x] Task 5: Move dashboard into route group (AC: 6)
  - [x] Create `src/app/(authenticated)/dashboard/page.tsx` with design-system headings (no duplicate auth check needed)
  - [x] Delete `src/app/dashboard/page.tsx`

- [x] Task 6: Run full test suite and type-check
  - [x] Run `npx vitest run` — 50 tests passed (13 files)
  - [x] Run `npx tsc --noEmit` — clean

## Dev Notes

### Route Group
Use Next.js route group `(authenticated)` — parenthesised segment is ignored in URL, so `/dashboard` stays `/dashboard`. All future authenticated pages go under this group.

### Role Lookup
Better Auth session user does not expose custom `role` field. Read it from Prisma using `session.user.id` in the Server Component layout. Cache is per-request (Next.js default).

### Prisma Import Path
ALWAYS: `import { prisma } from "@/lib/prisma"` — never `new PrismaClient()`.
Enums: `import { Role } from "@/generated/prisma/enums"` — never `from "@prisma/client"`.

### Active State Detection
`usePathname()` in NavBar. A link is active when `pathname === item.href || pathname.startsWith(item.href + "/")`. Dashboard `/dashboard` must not falsely match `/dashboard-something` — the `+ "/"` guard handles that.

### ToastProvider
Wire `ToastProvider` (from Story 1.3) in the authenticated layout — wraps everything so any page can call `useToast()`.

### Design Tokens
Top nav height: 60px (border-b border-[--color-border]).
Bottom tab bar: fixed bottom-0, border-t, bg-[--color-surface].
Nav link font: Montserrat bold uppercase 12px tracking-[0.15em].
Active: `text-[--color-primary]` + `border-b-2 border-[--color-primary]` (desktop).

## Dev Agent Record

### Implementation Plan
Create nav-items helper (testable pure function), NavBar client component, PageShell, then wire into (authenticated) route group layout. Move dashboard. Delete old dashboard.

### Debug Log

### Completion Notes
All 7 ACs satisfied. Role-aware nav built from pure `getNavItems()` function (3 tests). NavBar is a single client component covering both desktop top nav and mobile bottom tab bar using Tailwind `md:hidden`/`hidden md:flex`. PageShell enforces 1200px container. Authenticated route group layout reads role from Prisma post-session. Dashboard moved to route group. Auth tests updated to match new post-auth deletedAt check flow. 50/50 tests pass, TypeScript clean.

## File List

- `src/components/layout/nav-items.ts` — new: nav config + getNavItems()
- `src/components/layout/nav-items.test.ts` — new: 3 tests
- `src/components/layout/NavBar.tsx` — new: desktop top nav + mobile bottom bar
- `src/components/layout/PageShell.tsx` — new: content container
- `src/app/(authenticated)/layout.tsx` — new: authenticated route group layout
- `src/app/(authenticated)/dashboard/page.tsx` — new: dashboard moved here
- `src/app/dashboard/page.tsx` — deleted
- `src/lib/actions/auth.test.ts` — updated mocks to match post-auth deletedAt check flow

## Change Log

- 2026-06-17: Story 1.4 created and implementation started
