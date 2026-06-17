---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-11'
inputDocuments: ['prd.md', 'brief.md', 'DESIGN.md', 'EXPERIENCE.md']
workflowType: 'architecture'
project_name: 'VacationRequest'
user_name: 'Alessandro'
date: '2026-06-11'
lastStep: 1
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The system's core is a vacation request state machine (6 states: DRAFT, PENDING, APPROVED, REJECTED, CANCELLED, REVOKED) with role-gated transitions. Three distinct actors — Trainer, Supervisor, Fallback Approver — interact with the same entities under different permission sets that are mutually exclusive and dynamically managed. The balance engine is stateful and temporally complex: it tracks fresh entitlement, carry-over (with March 1 expiry), pending days, and taken days, correctly splitting cross-year requests across calendar year balances. User management (add/remove, supervisor assignment, fallback config with mandatory expiry) is an admin function owned by supervisors.

**Non-Functional Requirements:**
- 5-year data retention (Swiss employment law) — database records must be soft-deleted or archived, never hard-deleted; audit log is immutable and append-only
- Audit log is architecturally first-class: append-only, never modified by the same service that writes requests
- Availability: business hours (9–17 CET/CEST); no HA required; local machine v1 deployment acceptable
- Responsive web only — no native apps; mobile browser must be a first-class experience

**Scale & Complexity:**
- Primary domain: full-stack web application
- Complexity level: medium (small user base ~3–10 concurrent users, non-trivial domain logic)
- Estimated architectural components: auth/RBAC, request state machine, balance engine, notification service (dual-channel), scheduled jobs, audit log, user management

### Technical Constraints & Dependencies
- Hosting: local machine for v1 (future cloud migration noted as explicit change request)
- No MFA, no SSO, no social login — email/password only for v1
- English only
- Responsive web — desktop + mobile browser
- No payroll/HR system integration

### Cross-Cutting Concerns Identified

1. **Authentication & RBAC** — every route and action is role-gated; middleware must enforce both authentication and role; a trainer reaching `/approvals` gets 403, not a blank screen
2. **Deep-link auth flow** — email notification links must land on the specific request URL post-login (`returnTo` parameter); must be a first-class auth architecture requirement
3. **Dual-channel notifications** — in-app inbox + email triggered by every state transition; notification matrix is defined and complete
4. **Scheduled tasks** — carry-over expiry reminder (Feb 1), pending request reminder (5 working days), automatic fallback approver expiry; infrastructure should stay simple for v1 (host cron), but date/balance logic must be encapsulated in one place
5. **Audit logging** — immutable append-only log for all state changes, 5-year retention; architecturally separate from mutable request data
6. **Timezone handling** — Switzerland is CET/CEST (Europe/Zurich); all timestamps stored as UTC, displayed in Europe/Zurich; policy dates ("March 1", "February 1") defined as `YYYY-MM-01T00:00:00 Europe/Zurich` in business logic
7. **State machine enforcement** — transition rules must be enforced in code (explicit transition table + guard function), not just documented; an explicit map is preferred over a library dependency
8. **Date/time complexity** — cross-year balance calculation, working-day counting for reminders, 10-day grace period for entitlement edits, overlap prevention

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — Next.js App Router with TypeScript, based on project requirements for a responsive web app with complex server-side business logic and role-based access control.

### Starter Options Considered

- **create-t3-app** — considered but excluded; tRPC adds complexity without clear benefit at this scale; Better Auth is not in the T3 default
- **create-next-app (bare)** — selected; clean foundation, add only what's needed, avoids opinionated choices that conflict with custom design system

### Selected Starter: create-next-app@latest

**Rationale for Selection:**
Clean Next.js App Router baseline with TypeScript and Tailwind included. Dependencies added manually to match exact project requirements. Avoids bundled opinions that conflict with the custom Morges Natation design system or introduce unnecessary complexity.

**Initialization Command:**

```bash
npx create-next-app@latest vacation-request \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd vacation-request
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
npm install better-auth
npm install nodemailer @types/nodemailer
npm install node-cron @types/node-cron
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript strict mode throughout. Node.js 20.9+ required. Turbopack enabled by default (Next.js 16.x) for ~400% faster dev server startup.

**Styling Solution:**
Tailwind CSS used as a utility layer for implementing custom Morges Natation design tokens (colors, typography, spacing from DESIGN.md). No Tailwind component library — all components custom-built to match brand specification (0 border-radius, flat cards, Montserrat + Roboto).

**Build Tooling:**
Next.js 16.x with Turbopack. ESLint configured. Import alias `@/*` for clean imports.

**ORM & Migrations:**
Prisma v7.8.0 with PostgreSQL. Schema-first, auto-generated TypeScript client, migration history in `prisma/migrations/`. Required for the complex schema: requests, balance records, audit log, users, notifications, entitlements.

**Authentication:**
Better Auth v1.3.4 with Prisma adapter. Email/password credentials. Sessions stored in PostgreSQL — immediate invalidation, no vendor dependency. Deep-link `returnTo` parameter supported for email notification flows.

**Scheduled Jobs:**
node-cron for the three scheduled tasks (carry-over expiry reminder Feb 1, pending request reminder 5 working days, fallback approver auto-expiry). Zero infrastructure overhead for v1 local-machine deployment.

**Email:**
Nodemailer with local SMTP for v1. Zero vendor dependency, swappable to a cloud provider (Resend, SES) when hosting migrates.

**Code Organization:**
Next.js App Router conventions: `src/app/` for pages and API routes, `src/components/` for UI, `src/lib/` for business logic (balance engine, state machine, notification service).

**Note:** Project initialization using the above command should be the first implementation story.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Balance storage strategy (hybrid compute-from-source)
- State machine enforcement (explicit transition table)
- RBAC enforcement pattern (middleware + service layer)
- API pattern (Server Actions for mutations, API Routes for async)
- Session strategy (database sessions via Better Auth)

**Important Decisions (Shape Architecture):**
- Audit log as separate append-only table
- Soft deletes on users only; requests never deleted
- Deep-link auth flow with `returnTo` parameter
- No global client state library
- Notification inbox via 30s polling for v1
- Timezone handling (UTC storage, Europe/Zurich display)

**Deferred Decisions (Post-MVP):**
- Real-time push notifications (SSE/WebSocket) — polling sufficient for v1
- Cloud hosting and deployment pipeline — local machine for v1
- MFA, SSO, password reset — explicitly out of scope for v1
- Env var validation with Zod — simple startup check sufficient for v1

### Data Architecture

**Balance Storage — Hybrid Compute-from-Source:**
Entitlement records stored per trainer per year (`entitlements` table). Balance components (`pending`, `taken`, `remaining`, `carry_over`) computed dynamically at query time from request records by `VacationBalanceService`. No persisted balance snapshot to keep in sync. Cross-year splits and carry-over expiry calculated in the service layer.

**Audit Log — Separate Append-Only Table:**
Dedicated `audit_log` table. Schema: `id`, `actor_id` (FK → users), `action` (string), `entity_type` (string), `entity_id` (string), `timestamp` (UTC), `metadata` (JSON). Never updated or deleted. No cascade deletes touch it. Application layer enforces append-only at the service level.

**Soft Deletes — Users Only:**
`deleted_at` timestamp on `users` table. Vacation request records are never deleted (part of compliance audit trail). Queries filter `WHERE deleted_at IS NULL` for active users.

**Migrations:**
Prisma migration system (`prisma migrate dev` / `prisma migrate deploy`). All schema changes tracked in `prisma/migrations/`. Migration history committed to version control.

### Authentication & Security

**Session Strategy:**
Database sessions via Better Auth v1.3.4 with Prisma adapter. Sessions stored in PostgreSQL. 30-day rolling expiry. Immediate invalidation on logout or user deactivation. No JWT — no token revocation complexity.

**RBAC Enforcement:**
Two-layer enforcement:
1. Next.js middleware (`src/middleware.ts`) — guards page routes, redirects unauthenticated users to `/login?returnTo=<path>`, returns 403 for role mismatches on protected pages
2. Service layer — every mutation checks `canActorPerformAction(actor, action, resource)` before execution; role violations throw, never silently pass

Role stored on `users.role` (enum: `TRAINER | SUPERVISOR`). Fallback approver status derived from `fallback_approvers` table, not a separate role.

**Deep-Link Auth Flow:**
Login page accepts `?returnTo=<path>`. After successful authentication, redirect to `returnTo` value. Path validated against internal-only allowlist (must start with `/`, no external URLs) to prevent open redirect. Better Auth handles session creation; redirect is handled post-session in the login Server Action.

### API & Communication Patterns

**API Pattern — Server Actions + API Routes:**
- **Server Actions** (`"use server"`) for all user-initiated mutations: submit request, save draft, approve, reject, cancel, revoke, set entitlement, manage users, configure fallback
- **API Routes** (`src/app/api/`) for: cron job triggers (`/api/cron/*`), any future webhook integrations
- React Server Components for all data reads — no client-side fetch for page data

**Error Handling:**
Server Actions return typed result objects:
```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }
```
No thrown errors cross the server/client boundary. Client components read `result.success` and show toast notifications accordingly. Error codes (e.g. `OVERLAP_CONFLICT`, `INVALID_TRANSITION`, `ENTITLEMENT_LOCKED`) drive specific UX messaging.

**State Machine Enforcement:**
Explicit transition table in `src/lib/request-state-machine.ts`:
```ts
const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestStatus, Role[]>>> = {
  DRAFT:    { PENDING: ['TRAINER'] },
  PENDING:  { APPROVED: ['SUPERVISOR', 'FALLBACK'], REJECTED: ['SUPERVISOR', 'FALLBACK'], CANCELLED: ['TRAINER'] },
  APPROVED: { CANCELLED: ['TRAINER'], REVOKED: ['SUPERVISOR'] },
  REJECTED: {},
  CANCELLED: {},
  REVOKED:  {},
}
```
`canTransition(from, to, actorRole)` checked in every mutation service. Invalid transitions throw `INVALID_TRANSITION` — never silently permitted.

### Frontend Architecture

**State Management — Server-Driven:**
No global client state library (no Redux, no Zustand). React Server Components handle all data fetching. Server Actions handle all mutations. `useOptimistic` used for instant UI feedback on approve/reject actions. Client state strictly limited to UI concerns: modal visibility, toast queue, calendar selection state.

**Component Architecture — Feature-Based:**
```
src/components/
  ui/           — primitives: Button, Badge, Card, Input, Modal, Toast, Skeleton
  features/
    requests/   — RequestCard, RequestForm, RequestHistory, DateRangePicker
    balance/    — BalanceCard, BalanceSummary
    approvals/  — ApprovalQueue, ApprovalDetail
    trainers/   — TrainerCard, EntitlementForm, TrainerDetail
    users/      — UserManagement, FallbackConfig
    notifications/ — NotificationInbox, NotificationItem
  layout/       — Navigation, Sidebar, MobileNav, PageShell
```
All components custom-built per DESIGN.md specification. No external component library.

**Notification Inbox — 30s Polling:**
Unread count polled every 30 seconds via a lightweight `GET /api/notifications/unread-count` route. Full inbox loaded on `/notifications` page mount. Adequate for club-scale user base (3–10 users). Upgradeable to SSE post-v1 without architectural changes.

### Infrastructure & Deployment

**v1 Local Machine Deployment:**
`next start` process on local machine. PostgreSQL running locally. node-cron scheduler runs within the Next.js server process (registered at app startup in `src/lib/scheduler.ts`). No Docker required for v1; `docker-compose.yml` included for future use.

**Environment Configuration:**
`.env.local` — secrets (DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST, SMTP_USER, SMTP_PASS, NEXTAUTH_URL). `.env.example` committed with placeholder values. `src/lib/env.ts` validates required env vars at startup and throws descriptively if any are missing.

**CI (future-ready):**
`.github/workflows/ci.yml` included: TypeScript type-check, ESLint, Prisma schema validation. No deployment pipeline for v1.

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization + Prisma schema + Better Auth setup
2. Auth flow (login, session, RBAC middleware, `returnTo` deep-link)
3. User management (CRUD, supervisor assignment, fallback config)
4. Request state machine + balance service (core domain logic)
5. Trainer request flows (submit, draft, cancel)
6. Supervisor approval flows (approve, reject, revoke, entitlement)
7. Notification service (in-app + email on every transition)
8. Dashboards (trainer + supervisor views, balance display)
9. Audit log viewer
10. Scheduled jobs (cron setup, carry-over reminder, pending reminder, fallback expiry)

**Cross-Component Dependencies:**
- Balance service depends on request records and entitlement records — must be implemented before any balance display
- Notification service depends on state machine transitions — triggered as side-effect of every state change
- RBAC middleware depends on user/role data — must be in place before any role-gated route is built
- Scheduled jobs depend on notification service and balance engine — implemented last

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 8 areas where AI agents could make incompatible choices without explicit rules.

### Naming Patterns

**Database Naming Conventions (Prisma):**
- Table names: `snake_case` plural (`vacation_requests`, `audit_logs`, `entitlements`, `fallback_approvers`)
- Column names: `snake_case` via Prisma `@map` (`createdAt` in model → `created_at` in DB)
- Foreign keys: `snake_case` with `_id` suffix (`supervisor_id`, `actor_id`, `trainer_id`)
- Model names in schema: `PascalCase` singular (`VacationRequest`, `User`, `Entitlement`)
- Example: `model VacationRequest { id String @id; supervisorId String @map("supervisor_id") }`

**API / Server Action Naming Conventions:**
- Server Actions: `camelCase` verb+noun (`submitRequest`, `approveRequest`, `rejectRequest`, `setEntitlement`, `createUser`, `configureFallback`)
- Action files grouped by domain: `src/lib/actions/requests.ts`, `src/lib/actions/users.ts`, `src/lib/actions/entitlements.ts`
- API route paths: `kebab-case` (`/api/notifications/unread-count`, `/api/cron/carry-over-reminder`)

**Code Naming Conventions:**
- React components: `PascalCase.tsx` (`RequestCard.tsx`, `BalanceCard.tsx`, `ApprovalQueue.tsx`)
- Services: `kebab-case.service.ts` (`vacation-balance.service.ts`, `notification.service.ts`)
- Utilities/helpers: `kebab-case.ts` (`request-state-machine.ts`, `date.ts`, `errors.ts`)
- Hooks: `use-kebab-case.ts` (`use-notifications.ts`, `use-unread-count.ts`)
- Test files: co-located, same name + `.test.tsx` / `.test.ts`
- TypeScript types/interfaces: `PascalCase` (`VacationRequest`, `BalanceSnapshot`, `ActionResult`)
- Enums: `PascalCase` name, `SCREAMING_SNAKE` values (`RequestStatus.PENDING`)
- Constants: `SCREAMING_SNAKE_CASE` (`MAX_ENTITLEMENT_EDIT_DAYS`, `CARRY_OVER_EXPIRY_MONTH`)

### Structure Patterns

**Project Organization:**
- Business logic lives in `src/lib/services/` — one file per domain
- Server Actions in `src/lib/actions/` are thin wrappers that call services
- UI components in `src/components/` organised by feature (see structure section)
- Prisma singleton in `src/lib/prisma.ts` — imported everywhere, never re-instantiated
- All cron jobs registered in `src/lib/scheduler.ts` — imported once at app startup
- Date helpers centralised in `src/lib/date.ts`
- Error codes centralised in `src/lib/errors.ts`

**File Structure Patterns:**
- Tests co-located with source (`Component.test.tsx` next to `Component.tsx`)
- E2E tests in `tests/e2e/`
- Prisma schema in `prisma/schema.prisma`; migrations in `prisma/migrations/`
- Environment types in `src/lib/env.ts`

### Format Patterns

**Server Action Response Format (strictly enforced):**
```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; fields?: Record<string, string> }
```
Every Server Action returns `ActionResult<T>`. Never throws across the server/client boundary. Never returns raw objects.

**Date Formats:**
- Storage: UTC (`DateTime` Prisma type, maps to `TIMESTAMPTZ` in PostgreSQL)
- Display: `Europe/Zurich` timezone via helpers in `src/lib/date.ts`
- Policy dates in business logic: `new TZDate(year, month - 1, day, 'Europe/Zurich')` — never bare `new Date()`
- User-facing date format: `"Mon 14 Jul 2026"` (weekday abbreviated, day, month abbreviated, full year)

**JSON Field Naming:** `camelCase` in all API responses and Server Action payloads (Prisma default).

**Request Status Values:** Exactly match PRD — `DRAFT | PENDING | APPROVED | REJECTED | CANCELLED | REVOKED`. Stored as string enum in PostgreSQL.

### Communication Patterns

**Notification Event Naming:** `ENTITY_ACTION` pattern:
`REQUEST_SUBMITTED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_CANCELLED`, `REQUEST_REVOKED`, `ENTITLEMENT_SET`, `ENTITLEMENT_UPDATED`, `CARRY_OVER_EXPIRY_REMINDER`, `PENDING_REQUEST_REMINDER`

**Notification Service Interface:**
```ts
notificationService.send(event: NotificationEvent, recipients: User[], context: NotificationContext): Promise<void>
```
Always sends both in-app record (DB insert) and email (Nodemailer). Never called directly from Server Actions — called from within domain services as a side-effect after DB commit is confirmed.

**State Machine Transition Table:**
```ts
const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestStatus, Role[]>>> = {
  DRAFT:     { PENDING: ['TRAINER'] },
  PENDING:   { APPROVED: ['SUPERVISOR', 'FALLBACK'], REJECTED: ['SUPERVISOR', 'FALLBACK'], CANCELLED: ['TRAINER'] },
  APPROVED:  { CANCELLED: ['TRAINER'], REVOKED: ['SUPERVISOR'] },
  REJECTED:  {},
  CANCELLED: {},
  REVOKED:   {},
}
```
`canTransition(from, to, actorRole)` called before every status mutation. Returns `false` → throw `INVALID_TRANSITION`.

### Process Patterns

**Error Handling:**
- Error codes defined as constants in `src/lib/errors.ts`: `INVALID_TRANSITION`, `OVERLAP_CONFLICT`, `ENTITLEMENT_LOCKED`, `INSUFFICIENT_BALANCE`, `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`
- Domain services throw internal errors; Server Actions catch and map to `ActionResult` error shape
- Client components read `result.code` to show specific toast messages (e.g. `OVERLAP_CONFLICT` → "These dates overlap an existing request.")

**Loading State Patterns:**
- Page-level loading: Next.js `loading.tsx` with skeleton components (never spinners)
- Inline action loading: `useFormStatus` pending state on submit/approve/reject buttons
- Skeleton components mirror the shape of the content they replace (same card dimensions)

**Validation Patterns:**
- Server-side validation always enforced in Server Actions (source of truth)
- Client-side validation mirrors server rules for instant feedback (no network round-trip for obvious errors)
- Overlap check performed in `requestService.canSubmit()` before DRAFT → PENDING transition
- Date range validation: end date ≥ start date; neither date in the past; no overlap with PENDING or APPROVED requests for same trainer

### Enforcement Guidelines

**All AI Agents MUST:**
- Import Prisma client from `src/lib/prisma.ts` — never call `new PrismaClient()`
- Call `canTransition(from, to, actorRole)` before every request status mutation
- Return `ActionResult<T>` from every Server Action — never throw to client, never return raw data
- Use `src/lib/date.ts` helpers for all date construction and formatting in business logic — never bare `new Date()`
- Call `notificationService.send()` from within domain services — never construct or send emails directly in Server Actions
- Store all timestamps as UTC; always convert to `Europe/Zurich` for display

**Anti-Patterns (never do these):**
- `new PrismaClient()` outside `src/lib/prisma.ts`
- `throw new Error(...)` from a Server Action to the client
- `new Date('2026-03-01')` for policy date logic (timezone-naive)
- Direct `transporter.sendMail(...)` calls in Server Actions
- Status mutations without calling `canTransition` first
- Hard-coded status strings like `'pending'` — always use `RequestStatus.PENDING` enum

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
vacation-request/
├── .env.example
├── .env.local                          # git-ignored
├── .eslintrc.json
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                      # type-check + lint + prisma validate
├── docker-compose.yml                  # PostgreSQL for future use
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
│
├── prisma/
│   ├── schema.prisma                   # User, VacationRequest, Entitlement,
│   │                                   # AuditLog, Notification, FallbackApprover
│   └── migrations/
│
├── public/
│   └── fonts/                          # Montserrat, Roboto self-hosted
│
└── src/
    ├── middleware.ts                    # RBAC route guards, returnTo redirect
    │
    ├── app/
    │   ├── globals.css                 # Tailwind base + design token CSS vars
    │   ├── layout.tsx                  # Root layout (auth shell)
    │   ├── loading.tsx
    │   ├── login/
    │   │   └── page.tsx                # Login form, handles ?returnTo
    │   ├── dashboard/
    │   │   ├── page.tsx                # Role-switched: trainer or supervisor view
    │   │   └── loading.tsx
    │   ├── requests/
    │   │   ├── page.tsx                # Trainer: My Requests history
    │   │   ├── new/
    │   │   │   └── page.tsx            # Trainer: New request form + date picker
    │   │   └── loading.tsx
    │   ├── approvals/
    │   │   ├── page.tsx                # Supervisor: Pending queue
    │   │   ├── [id]/
    │   │   │   └── page.tsx            # Supervisor: Request detail (deep-link target)
    │   │   └── loading.tsx
    │   ├── trainers/
    │   │   ├── page.tsx                # Supervisor: Trainer list + balances
    │   │   ├── [id]/
    │   │   │   └── page.tsx            # Supervisor: Trainer detail + entitlement form
    │   │   └── loading.tsx
    │   ├── users/
    │   │   ├── page.tsx                # Supervisor: User management + fallback config
    │   │   └── loading.tsx
    │   ├── notifications/
    │   │   ├── page.tsx                # Both roles: Notification inbox
    │   │   └── loading.tsx
    │   └── api/
    │       ├── auth/
    │       │   └── [...all]/
    │       │       └── route.ts        # Better Auth handler
    │       ├── notifications/
    │       │   └── unread-count/
    │       │       └── route.ts        # GET: unread count for 30s polling
    │       └── cron/
    │           ├── carry-over-reminder/
    │           │   └── route.ts        # POST: triggered by node-cron Feb 1
    │           ├── pending-reminder/
    │           │   └── route.ts        # POST: triggered by node-cron daily
    │           └── fallback-expiry/
    │               └── route.ts        # POST: triggered by node-cron daily
    │
    ├── components/
    │   ├── ui/
    │   │   ├── button.tsx              # primary, outline, secondary, danger variants
    │   │   ├── badge.tsx               # Status badge (all 6 states)
    │   │   ├── card.tsx                # Flat, 1px border, 0 radius
    │   │   ├── input.tsx               # Floating label, 50px height, focus ring
    │   │   ├── modal.tsx               # Confirmation modals (cancel, revoke)
    │   │   ├── toast.tsx               # Bottom-left, auto-dismiss 4s
    │   │   ├── skeleton.tsx            # Card and table row variants
    │   │   └── textarea.tsx            # Rejection/revocation reason field
    │   ├── features/
    │   │   ├── requests/
    │   │   │   ├── RequestCard.tsx
    │   │   │   ├── RequestHistory.tsx
    │   │   │   ├── RequestForm.tsx
    │   │   │   ├── DateRangePicker.tsx     # Two-month calendar, blocked dates
    │   │   │   ├── ConfirmationPopup.tsx   # Pre-submit summary
    │   │   │   └── DraftCard.tsx
    │   │   ├── balance/
    │   │   │   ├── BalanceCard.tsx         # Fresh/carry-over/pending/taken/remaining
    │   │   │   └── BalanceBar.tsx          # Visual fill bar
    │   │   ├── approvals/
    │   │   │   ├── ApprovalQueue.tsx
    │   │   │   ├── ApprovalDetail.tsx
    │   │   │   └── RejectionForm.tsx
    │   │   ├── trainers/
    │   │   │   ├── TrainerSummaryCard.tsx
    │   │   │   ├── TrainerList.tsx
    │   │   │   └── EntitlementForm.tsx     # Locked after 10-day grace period
    │   │   ├── users/
    │   │   │   ├── UserList.tsx
    │   │   │   ├── UserForm.tsx
    │   │   │   └── FallbackConfig.tsx      # Fallback approver + expiry date
    │   │   └── notifications/
    │   │       ├── NotificationInbox.tsx
    │   │       ├── NotificationItem.tsx
    │   │       └── UnreadBadge.tsx
    │   └── layout/
    │       ├── Navigation.tsx              # Top nav (desktop) / bottom tab bar (mobile)
    │       ├── Sidebar.tsx
    │       ├── PageShell.tsx
    │       └── RoleGuard.tsx
    │
    ├── lib/
    │   ├── prisma.ts                       # Singleton PrismaClient
    │   ├── auth.ts                         # Better Auth config + Prisma adapter
    │   ├── env.ts                          # Env var validation + typed exports
    │   ├── date.ts                         # TZDate helpers, formatDate, workingDaysBetween
    │   ├── errors.ts                       # Error code constants
    │   ├── request-state-machine.ts        # TRANSITIONS table + canTransition()
    │   ├── scheduler.ts                    # node-cron job registration
    │   ├── email.ts                        # Nodemailer transporter + sendEmail()
    │   ├── actions/
    │   │   ├── auth.ts                     # login, logout
    │   │   ├── requests.ts                 # submitRequest, saveDraft, cancelRequest
    │   │   ├── approvals.ts                # approveRequest, rejectRequest, revokeRequest
    │   │   ├── entitlements.ts             # setEntitlement
    │   │   └── users.ts                    # createUser, deleteUser, assignSupervisor, configureFallback
    │   └── services/
    │       ├── request.service.ts          # canSubmit (overlap), transitions
    │       ├── vacation-balance.service.ts # Balance calculation, cross-year, carry-over
    │       ├── notification.service.ts     # send() — in-app + email
    │       ├── audit.service.ts            # log() — append-only insert
    │       ├── entitlement.service.ts      # Grace period enforcement
    │       └── user.service.ts             # CRUD, fallback expiry
    │
    └── types/
        └── index.ts                        # ActionResult, NotificationEvent, shared types

tests/
└── e2e/
```

### Architectural Boundaries

**API Boundaries:**
- `/login` — unauthenticated; all other routes require valid session
- Trainer-only routes: `/requests/*` — middleware 403 for SUPERVISOR
- Supervisor-only routes: `/approvals/*`, `/trainers/*`, `/users` — middleware 403 for TRAINER
- Shared routes: `/dashboard`, `/notifications` — content differs by role
- Internal cron routes (`/api/cron/*`) — called by node-cron within the same process only
- Notification polling (`/api/notifications/unread-count`) — authenticated, both roles

**Service Boundaries:**
- Server Actions → Services → Prisma (strict one-way dependency)
- `notificationService.send()` called by domain services after DB commit; never from Server Actions or UI
- `auditService.log()` called by domain services after every state-changing DB operation
- `vacationBalanceService` is read-only — computes from records, never mutates

**Data Boundaries:**
- `vacation_requests` — mutable via services; never deleted (5-year retention)
- `audit_log` — append-only; no `UPDATE` or `DELETE` ever issued
- `users` — soft-delete via `deleted_at`; all active queries filter `WHERE deleted_at IS NULL`
- `entitlements` — locked after 10-day grace period enforced at service layer

### Requirements to Structure Mapping

**Feature Mapping:**
- Trainer request flows → `src/app/requests/`, `src/lib/actions/requests.ts`, `src/lib/services/request.service.ts`, `src/components/features/requests/`
- Supervisor approval flows → `src/app/approvals/`, `src/lib/actions/approvals.ts`, `src/components/features/approvals/`
- Balance display → `src/lib/services/vacation-balance.service.ts`, `src/components/features/balance/`
- Entitlement management → `src/app/trainers/[id]/`, `src/lib/actions/entitlements.ts`, `src/lib/services/entitlement.service.ts`
- User management + fallback → `src/app/users/`, `src/lib/actions/users.ts`, `src/lib/services/user.service.ts`
- Notifications → `src/lib/services/notification.service.ts`, `src/lib/email.ts`, `src/app/notifications/`
- Audit log → `src/lib/services/audit.service.ts`, Prisma `AuditLog` model
- Scheduled jobs → `src/lib/scheduler.ts`, `src/app/api/cron/`

**Cross-Cutting Concerns:**
- Auth + RBAC → `src/lib/auth.ts`, `src/middleware.ts`, `src/lib/actions/auth.ts`
- State machine → `src/lib/request-state-machine.ts`
- Timezone → `src/lib/date.ts`
- Error codes → `src/lib/errors.ts`

### Data Flow

**Read path:** RSC page → Prisma (direct or via service) → server-rendered HTML with Suspense skeleton

**Write path:** Client form → Server Action → service (validate + canTransition + DB write + audit.log + notification.send) → `ActionResult<T>` → client toast

**Scheduled path:** node-cron fires → `/api/cron/*` route → service → DB write + notification.send

### Development Workflow

**Development:** `next dev` (Turbopack); `prisma studio` for DB inspection; `prisma migrate dev` for schema changes

**Database setup:** `prisma migrate dev` creates schema; `prisma db seed` for initial supervisor account

**Build + Deploy (v1):** `next build` → `next start`; node-cron starts within the server process via `scheduler.ts` import

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Next.js 16 App Router + Prisma v7.8.0 + Better Auth v1.3.4 + Tailwind CSS — all confirmed compatible and actively maintained in 2026. Server Actions pattern aligns with App Router idioms with no conflicts with Better Auth session handling. node-cron running within the Next.js server process is compatible with `next start` local deployment. Prisma v7 fully TypeScript-based runtime is compatible with strict mode TypeScript throughout.

**Pattern Consistency:**
State machine (`canTransition`) enforced at service layer — consistent with Server Actions calling services, never bypassed. `ActionResult<T>` return type defined once in `src/types/index.ts` and used by all actions uniformly. All date logic centralised through `src/lib/date.ts`. Notification side-effects in services (not actions) — consistent with the one-way data flow architecture.

**Structure Alignment:**
Feature folders in `src/components/features/` map directly to PRD sections. Service files map 1:1 to domain objects. API routes cover all async needs; Server Actions cover all sync mutations. No structural gaps identified.

### Requirements Coverage Validation ✅

| PRD Section | Covered By | Status |
|---|---|---|
| §2 Users & Roles | `users` table, RBAC middleware, `Role` enum | ✅ |
| §3 Request Lifecycle (6 states) | `request-state-machine.ts`, `request.service.ts` | ✅ |
| §3.4 Overlap Prevention | `requestService.canSubmit()` | ✅ |
| §3.5 Cross-Year Requests | `vacation-balance.service.ts` year-split logic | ✅ |
| §4 Balance & Entitlement | `vacation-balance.service.ts`, `entitlement.service.ts`, `BalanceCard.tsx` | ✅ |
| §4.2 Carry-Over + March 1 Expiry | Balance service + `/api/cron/carry-over-reminder` | ✅ |
| §4.1 10-Day Grace Period | `entitlement.service.ts` grace period check | ✅ |
| §5 Notifications (dual-channel) | `notification.service.ts`, `email.ts`, `Notification` DB model | ✅ |
| §5.3 Automated Reminders | `scheduler.ts` + cron API routes | ✅ |
| §6 Dashboards | `src/app/dashboard/page.tsx` (role-switched), feature components | ✅ |
| §7 User Management | `src/app/users/`, `user.service.ts`, `FallbackConfig.tsx` | ✅ |
| §8 Authentication | `src/lib/auth.ts` (Better Auth), `src/middleware.ts`, `returnTo` flow | ✅ |
| §9 Audit Log | `audit.service.ts`, `AuditLog` Prisma model | ✅ |
| §10 NFRs: 5-year retention | No-delete policy on `vacation_requests` + `audit_log` | ✅ |
| §10 NFRs: Responsive web | Mobile-first layout, bottom tab bar on mobile | ✅ |
| §10 NFRs: Local machine v1 | `next start` + local PostgreSQL | ✅ |
| §10 NFRs: Timezone (CET/CEST) | `src/lib/date.ts` with `Europe/Zurich`, UTC storage | ✅ |
| Deep-link auth (EXPERIENCE.md) | `?returnTo` in middleware + login Server Action | ✅ |
| Custom design system (DESIGN.md) | Custom `src/components/ui/` per all DESIGN.md tokens | ✅ |

### Implementation Readiness Validation ✅

All critical decisions documented with verified technology versions. State machine enforced in code. Service layer boundaries prevent logic leakage. Timezone handling centralised. Deep-link auth flow fully specified. Audit log isolation enforced at data boundary. All 3 scheduled jobs have explicit implementation paths.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps:**
- Audit log viewer UI (supervisor-facing read-only page) — route not yet defined; can be added as a late epic
- Prisma seed file for initial supervisor account — small implementation detail, not architectural

**Nice-to-Have:**
- Real-time notification push (SSE) to replace 30s polling — post-v1
- `zod` for env var validation in `src/lib/env.ts` — simple startup check sufficient for v1

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** High

**Key Strengths:**
- State machine and balance engine architecturally isolated and independently testable
- Service layer enforces all business rules before any DB write
- 5-year compliance requirement met structurally (no-delete + audit log isolation)
- Timezone handling explicit and centralised — no accidental UTC/local drift possible
- Deep-link auth flow fully specified — won't surface as a gap during implementation

**Areas for Future Enhancement (post-v1):**
- Real-time notification push (SSE/WebSocket)
- Cloud hosting + deployment pipeline (explicit change request in PRD)
- MFA and password reset (explicitly deferred in PRD §8)
- Audit log viewer UI (supervisor-facing)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and service boundaries
- Refer to this document for all architectural questions — it is the single source of truth

**First Implementation Priority:**
```bash
npx create-next-app@latest vacation-request --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```
Then: Prisma schema → Better Auth setup → RBAC middleware → core domain services → request flows → approval flows → notification service → dashboards → scheduled jobs.
