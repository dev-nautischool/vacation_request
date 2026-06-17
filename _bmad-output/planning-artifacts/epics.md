---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prd.md
  - architecture.md
  - EXPERIENCE.md
  - DESIGN.md
---

# VacationRequest - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for VacationRequest, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system must support three roles — Trainer, Supervisor, and Fallback Approver — with mutually exclusive permissions. A person holds either the Trainer role or the Supervisor role, never both.
FR2: A trainer must be able to submit a vacation request by selecting a date range, previewing a confirmation summary, and confirming submission.
FR3: A trainer must be able to save a vacation request as a DRAFT without submitting it.
FR4: A trainer must be able to cancel a PENDING or APPROVED request.
FR5: A trainer must be able to delete a DRAFT request.
FR6: A trainer must be able to view their own vacation request history with statuses.
FR7: A trainer must be able to view their own vacation balance (fresh entitlement, carry-over, pending, taken, remaining).
FR8: A supervisor must be able to approve a PENDING request.
FR9: A supervisor must be able to reject a PENDING request, with a mandatory reason.
FR10: A supervisor must be able to revoke an APPROVED request, with a mandatory reason.
FR11: A supervisor must be able to set a trainer's annual entitlement (once per calendar year, editable within a 10-day grace period).
FR12: The system must enforce a 10-day grace period for entitlement edits; after the grace period, the entitlement is locked.
FR13: A supervisor must be able to view per-trainer balance cards for all their assigned trainers.
FR14: A supervisor must be able to view the approval queue (all PENDING requests from their trainers).
FR15: A supervisor must be able to view the full request history for all their assigned trainers.
FR16: The system must enforce the full request state machine: DRAFT → PENDING → APPROVED/REJECTED/CANCELLED; APPROVED → CANCELLED/REVOKED. Invalid transitions are blocked.
FR17: The system must prevent submission (DRAFT → PENDING) if the new dates overlap any PENDING or APPROVED request for the same trainer.
FR18: When a request spans two calendar years, the system must deduct days from the correct year's balance.
FR19: Unused carry-over days from Year N must automatically roll over to Year N+1 and expire on March 1 of Year N+1.
FR20: The system must send in-app and email notifications for every lifecycle event per the notification matrix (draft saved, submitted, approved, rejected, cancelled, revoked, entitlement set/updated).
FR21: The system must send an automated carry-over expiry reminder (in-app + email) to the trainer on February 1 if carry-over days remain.
FR22: The system must send an automated pending request reminder (in-app + email) to the supervisor (and fallback if configured) if a request remains PENDING for 5 working days.
FR23: A supervisor must be able to configure a fallback approver (another supervisor) with a mandatory expiry date; the fallback is automatically cleared when the expiry date passes.
FR24: A fallback approver can approve or reject PENDING requests for the delegating supervisor's trainers only; they cannot revoke, manage entitlements, or manage users.
FR25: A supervisor must be able to add and remove trainer accounts and supervisor accounts.
FR26: A supervisor must be able to assign a supervisor to a trainer (one supervisor per trainer at a time).
FR27: The system must maintain an append-only, read-only audit log recording actor, action, entity, and timestamp for every state-changing operation.
FR28: Supervisors must be able to view the audit log.
FR29: The system must support email and password login; accounts are created manually by a supervisor.
FR30: After authentication via a deep-link email notification, the user must be redirected to the originally requested URL (returnTo flow).
FR31: Email notification links from supervisors/fallbacks must deep-link directly to the specific request URL.

### NonFunctional Requirements

NFR1: Vacation records and audit log must be retained for 5 years (Swiss employment law compliance). Records are never hard-deleted.
NFR2: The application must be available during business hours (09:00–17:00 CET/CEST); scheduled downtime outside those hours is acceptable.
NFR3: The application must be deployable on a local machine for v1 (Next.js `next start` + local PostgreSQL).
NFR4: The application must be a responsive web application supporting desktop and mobile browsers. No native apps.
NFR5: All timestamps must be stored as UTC and displayed in the Europe/Zurich timezone.
NFR6: The application must be in English only.
NFR7: All page routes must be protected by authentication and role-based access control; unauthorized access returns 403.
NFR8: The audit log must be architecturally append-only — no UPDATE or DELETE is ever issued against audit_log records.
NFR9: The application must use soft deletes for user records (`deleted_at` field); vacation request records are never deleted.

### Additional Requirements

- AR1: Project must be initialized using `create-next-app@latest` with TypeScript strict, Tailwind CSS, ESLint, App Router, `src/` directory, and `@/*` import alias, then manually add Prisma, Better Auth, Nodemailer, and node-cron.
- AR2: Prisma schema must define: `User`, `VacationRequest`, `Entitlement`, `AuditLog`, `Notification`, `FallbackApprover` models following the naming conventions (snake_case DB columns, PascalCase model names, FK suffixed `_id`).
- AR3: Better Auth v1.3.4 with Prisma adapter and database sessions (PostgreSQL) must be configured; no JWT, no vendor dependency; 30-day rolling expiry; immediate invalidation on logout/deactivation.
- AR4: All Server Actions must return `ActionResult<T>` (typed discriminated union); never throw across the server/client boundary.
- AR5: The request state machine must be implemented as an explicit TRANSITIONS table in `src/lib/request-state-machine.ts`; `canTransition(from, to, actorRole)` must be called before every status mutation.
- AR6: Balance calculation (fresh entitlement, carry-over, pending, taken, remaining, cross-year splits) must be computed dynamically in `VacationBalanceService`; no persisted balance snapshot.
- AR7: Notification side-effects must be triggered from within domain services (after DB commit), never directly from Server Actions.
- AR8: All date/time logic must use helpers from `src/lib/date.ts`; policy dates must use `TZDate` with `Europe/Zurich`; never use bare `new Date()` in business logic.
- AR9: node-cron jobs (carry-over reminder Feb 1, pending reminder daily, fallback expiry daily) must be registered at app startup in `src/lib/scheduler.ts`.
- AR10: Environment variables must be validated at startup in `src/lib/env.ts`; `.env.example` committed with placeholders.
- AR11: Unread notification count must be polled every 30 seconds via `GET /api/notifications/unread-count`.
- AR12: A `docker-compose.yml` must be included (PostgreSQL) for future use; not required to run for v1.
- AR13: A `.github/workflows/ci.yml` must include TypeScript type-check, ESLint, and Prisma schema validation.
- AR14: RBAC must be enforced at two layers: Next.js middleware (route guard, returnTo redirect) AND service layer (canActorPerformAction check before every mutation).
- AR15: Error codes must be centralised in `src/lib/errors.ts`: `INVALID_TRANSITION`, `OVERLAP_CONFLICT`, `ENTITLEMENT_LOCKED`, `INSUFFICIENT_BALANCE`, `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`.

### UX Design Requirements

UX-DR1: Implement the Morges Natation design token system as Tailwind CSS custom tokens and CSS variables in `globals.css`: primary red (#e5222d), status colors (6 states), carry-over accent (#14a5eb), surface/text/border tokens.
UX-DR2: Implement 7 primitive UI components per DESIGN.md specification: Button (4 variants: primary, outline, secondary, danger), Badge (status, 6 states), Card (flat, 1px border, 0 radius), Input (floating label, 50px height, focus ring), Modal, Toast (bottom-left, 4s auto-dismiss, 4 types), Skeleton (card and table-row variants).
UX-DR3: Implement Textarea component for rejection/revocation reason fields.
UX-DR4: Implement the two-font system: Montserrat (headings/labels, self-hosted) + Roboto (body) with typography scale matching DESIGN.md.
UX-DR5: Implement the two-column responsive layout: single-column on mobile, two-column on desktop. Navigation switches between bottom tab bar (mobile) and left sidebar/top nav (desktop).
UX-DR6: Implement the BalanceCard component displaying fresh entitlement, carry-over (with expiry date and carry-over color accent), pending, taken, and remaining fields. Include a visual BalanceBar (fill bar: remaining/total).
UX-DR7: Implement the DateRangePicker component: two-month calendar (EasyJet-style), PENDING/APPROVED dates grayed and non-selectable, selected range highlighted in primary red, live day count, full-screen modal on mobile / inline panel on desktop.
UX-DR8: Implement the ConfirmationPopup component: shows selected dates, day count, balance remaining after approval, "Confirm & Submit" and "Back" actions.
UX-DR9: Implement the ApprovalQueue and ApprovalDetail components: trainer name + avatar initial, dates, day count, balance snapshot, approve/reject buttons, inline rejection reason textarea, revoke button (APPROVED only).
UX-DR10: Implement TrainerSummaryCard with balance bar, pending request count badge (red if > 0), and trainer detail quick-link.
UX-DR11: Implement RequestHistory view: table of requests with date range, day count, status badge, submission date, cancel action (if PENDING/APPROVED). Horizontally scrollable on mobile with sticky first column.
UX-DR12: Implement DraftCard component: shows saved draft dates and day count; "Continue" (opens form prefilled) and "Delete" buttons.
UX-DR13: Implement the NotificationInbox page: chronological list, unread dot indicator, "Mark all read" button, click-to-deep-link navigation. UnreadBadge component on nav icon.
UX-DR14: Implement the Toast system: bottom-left stacked, 4s auto-dismiss, manual X dismiss, ARIA live region announcement for screen readers.
UX-DR15: Implement empty states for: Trainer Dashboard (no requests), Supervisor Approvals (empty queue), Notifications (all read).
UX-DR16: Implement loading skeleton states for all card and table components; no spinners for page-level loading.
UX-DR17: Implement accessibility floor: all interactive elements keyboard-navigable (Tab/Enter/Space/Escape for modals), status badges include text label (not just color), form inputs have visible labels, minimum 44×44px touch targets on mobile, focus ring (2px primary outline) on all interactive elements.
UX-DR18: Implement the EntitlementForm with grace-period enforcement: editable within 10-day window, read-only with locked indicator + tooltip after grace period.
UX-DR19: Implement the FallbackConfig UI: select another supervisor as fallback, mandatory expiry date field, visual indicator when fallback is active.
UX-DR20: Implement the UserManagement page: list of users (trainers + supervisors), add/remove actions, supervisor assignment per trainer.

### FR Coverage Map

FR1: Epic 2 — Role model enforcement via user records
FR2: Epic 3 — Trainer submits request
FR3: Epic 3 — Trainer saves draft
FR4: Epic 3 — Trainer cancels PENDING/APPROVED request
FR5: Epic 3 — Trainer deletes draft
FR6: Epic 3 — Trainer views request history
FR7: Epic 3 — Trainer views balance
FR8: Epic 4 — Supervisor approves request
FR9: Epic 4 — Supervisor rejects request (reason required)
FR10: Epic 4 — Supervisor revokes approved request (reason required)
FR11: Epic 4 — Supervisor sets annual entitlement
FR12: Epic 4 — 10-day grace period enforcement
FR13: Epic 4 — Supervisor views per-trainer balance cards
FR14: Epic 4 — Supervisor views approval queue
FR15: Epic 4 — Supervisor views full request history
FR16: Epic 3 — State machine enforcement
FR17: Epic 3 — Overlap prevention
FR18: Epic 3 — Cross-year balance split
FR19: Epic 3 — Carry-over roll-over + March 1 expiry
FR20: Epic 5 — Lifecycle event notifications (in-app + email)
FR21: Epic 5 — Carry-over expiry reminder (Feb 1)
FR22: Epic 5 — Pending request reminder (5 working days)
FR23: Epic 2 — Fallback approver configuration + expiry
FR24: Epics 2+4 — Fallback approver permission scope (config in Epic 2, enforcement in Epic 4)
FR25: Epic 2 — Add/remove trainer and supervisor accounts
FR26: Epic 2 — Assign supervisor to trainer
FR27: Epics 3+4+5 — Audit log written throughout; Epic 5 closes full coverage
FR28: Epic 5 — Audit log viewer (supervisor-facing)
FR29: Epic 1 — Email/password authentication
FR30: Epic 1 — Deep-link returnTo auth flow
FR31: Epic 1 — Email deep-links to specific request URL

## Epic List

### Epic 1: Project Foundation & Authentication
Developers and club members can run the application and log in securely. The project is initialized with the full tech stack, design system, UI primitives, and RBAC-enforced authentication with deep-link support.
**FRs covered:** FR29, FR30, FR31
**NFRs covered:** NFR3, NFR4, NFR5, NFR6, NFR7
**ARs covered:** AR1, AR2, AR3, AR8, AR10, AR12, AR13, AR14, AR15
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5

### Epic 2: User & Account Management
Supervisors can manage the club's user base: create/remove trainers and supervisors, assign each trainer to a supervisor, and configure a fallback approver with a mandatory expiry date.
**FRs covered:** FR1, FR23, FR24 (permission scope), FR25, FR26
**NFRs covered:** NFR9
**UX-DRs covered:** UX-DR19, UX-DR20

### Epic 3: Trainer Vacation Request Flows
Trainers can submit vacation requests, save drafts, cancel requests, and track their own balance and history. The core domain engine (state machine, balance service, overlap prevention, cross-year splits, audit logging for trainer actions) is implemented end-to-end.
**FRs covered:** FR2, FR3, FR4, FR5, FR6, FR7, FR16, FR17, FR18, FR19
**NFRs covered:** NFR1, NFR8
**ARs covered:** AR4, AR5, AR6, AR7 (partial — trainer side)
**UX-DRs covered:** UX-DR6, UX-DR7, UX-DR8, UX-DR11, UX-DR12, UX-DR15, UX-DR16, UX-DR17

### Epic 4: Supervisor Approval & Entitlement Flows
Supervisors can approve, reject, and revoke vacation requests from their trainers; set and manage annual entitlements within the 10-day grace period; and view trainer balance cards, the approval queue, and full request history. Fallback approver approval/rejection rights are enforced.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR24 (approval actions), FR27, FR28
**ARs covered:** AR4, AR5 (enforced for supervisor transitions)
**UX-DRs covered:** UX-DR9, UX-DR10, UX-DR18

### Epic 5: Notifications, Scheduled Jobs & Audit Log Viewer
All lifecycle events trigger dual-channel notifications (in-app + email). Trainers and supervisors can view their notification inbox. Three automated jobs run on schedule (carry-over expiry reminder Feb 1, pending request reminder at 5 working days, fallback approver auto-expiry). Supervisors can view the read-only audit log.
**FRs covered:** FR20, FR21, FR22, FR27 (full wire-up), FR28 (viewer UI)
**NFRs covered:** NFR1 (full compliance closure), NFR8
**ARs covered:** AR7, AR9, AR11
**UX-DRs covered:** UX-DR13, UX-DR14

---

## Epic 1: Project Foundation & Authentication

Developers and club members can run the application and log in securely. The project is initialized with the full tech stack, design system, UI primitives, and RBAC-enforced authentication with deep-link support.

### Story 1.1: Project Initialization & Infrastructure Setup

As a developer,
I want the project scaffolded with all required dependencies, environment configuration, CI pipeline, and Docker setup,
So that the team has a reproducible, ready-to-develop baseline from day one.

**Acceptance Criteria:**

**Given** the initialization command is run (`create-next-app` + npm installs for prisma, better-auth, nodemailer, node-cron)
**When** setup completes
**Then** `npm run dev` starts the Turbopack dev server without errors
**And** `npm run build` completes without TypeScript or ESLint errors

**Given** `.env.local` is missing or any required variable is absent
**When** the server starts
**Then** `src/lib/env.ts` throws a descriptive startup error listing each missing variable name

**Given** the project root
**When** `.env.example` is inspected
**Then** all required variables (DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST, SMTP_USER, SMTP_PASS, NEXTAUTH_URL) are present as placeholder entries with no real secrets committed

**Given** a push or pull request is created
**When** `.github/workflows/ci.yml` runs
**Then** TypeScript type-check, ESLint, and `prisma validate` all pass

**Given** `docker-compose up` is run
**When** the container starts
**Then** a PostgreSQL instance is accessible at the configured DATABASE_URL

---

### Story 1.2: Prisma Schema & Database Initialization

As a developer,
I want the complete domain schema defined in Prisma and migrated to the database,
So that all models are available for subsequent implementation stories.

**Acceptance Criteria:**

**Given** the Prisma schema is written
**When** `npx prisma migrate dev` runs
**Then** all six tables are created: `users`, `vacation_requests`, `entitlements`, `audit_logs`, `notifications`, `fallback_approvers`

**Given** the `users` model
**When** inspected
**Then** it includes `id`, `email`, `name`, `role` (enum: TRAINER | SUPERVISOR), `supervisor_id` (FK → users, nullable), `deleted_at` (nullable), `created_at`, and the password hash field required by Better Auth

**Given** the `vacation_requests` model
**When** inspected
**Then** it includes `id`, `trainer_id` (FK → users), `status` (string), `start_date`, `end_date`, `days_count`, `reason` (nullable), `created_at`, `updated_at` — and has no DELETE cascade that could remove records

**Given** the `audit_logs` model
**When** inspected
**Then** it has no `updated_at` field (append-only design) and includes `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `metadata` (JSON)

**Given** `npx prisma db seed` is run
**When** the seed completes
**Then** one supervisor account exists (e.g., admin@morges-natation.ch) and the application accepts login with those credentials

---

### Story 1.3: Design Token System & UI Primitives

As a developer,
I want the Morges Natation design token system and all primitive UI components implemented,
So that every feature story can use consistent, brand-aligned building blocks without making local styling decisions.

**Acceptance Criteria:**

**Given** `src/app/globals.css`
**When** inspected
**Then** all DESIGN.md tokens are defined as CSS custom properties: `--color-primary`, `--color-surface`, `--color-border`, all six `--color-status-*` variants, `--color-carry-over`, and all `--color-text-*` variants

**Given** the Button component rendered with any of the four variants (primary, outline, secondary, danger)
**When** displayed
**Then** each matches DESIGN.md: correct background/border/hover colors, Montserrat uppercase bold font, 13px 22px padding, 0 border-radius

**Given** the Badge component rendered with any of the six statuses (DRAFT, PENDING, APPROVED, REJECTED, CANCELLED, REVOKED)
**When** displayed
**Then** it shows the matching status color for both text and border, and always includes the text label (color is never the only differentiator)

**Given** the Input component
**When** focused
**Then** height is 50px, border is 2px, border-radius is 0, the floating label is visible, and the border color changes to `--color-primary`

**Given** the Toast component
**When** triggered
**Then** it appears bottom-left, auto-dismisses after 4 seconds, supports manual X dismiss, and announces via `role="status"` ARIA live region

**Given** the Skeleton component
**When** rendered
**Then** it provides card-shaped and table-row-shaped variants that match the dimensions of the content they replace

**Given** any page that uses Montserrat or Roboto
**When** network requests are inspected
**Then** fonts are served from `public/fonts/` with no external font requests

---

### Story 1.4: Application Layout & Responsive Navigation Shell

As a user,
I want a responsive application shell with navigation that adapts between desktop and mobile,
So that I can comfortably use the app on any device.

**Acceptance Criteria:**

**Given** a desktop viewport (≥1024px) and an authenticated user
**When** any protected page loads
**Then** a left sidebar or top navigation is shown with role-appropriate menu items (Trainer: Dashboard, My Requests, Notifications; Supervisor: Dashboard, Approvals, Trainers, Users, Notifications)

**Given** a mobile viewport (<1024px)
**When** any authenticated page loads
**Then** a bottom tab bar replaces the sidebar, with each tap target at least 44×44px

**Given** any page-level loading state
**When** the route is transitioning
**Then** a `loading.tsx` skeleton placeholder is shown that mirrors the card/table dimensions of the destination page — no spinners

**Given** any interactive element in the navigation (links, buttons, modal triggers)
**When** navigated with the Tab key
**Then** a 2px `--color-primary` focus ring is visible and the tab order is logical

---

### Story 1.5: Email & Password Authentication

As a club member,
I want to log in with my email and password and log out securely,
So that my account and data are protected.

**Acceptance Criteria:**

**Given** a user with a valid account
**When** they submit correct credentials
**Then** a database session is created with 30-day rolling expiry and they are redirected to `/dashboard`

**Given** a user submits incorrect credentials
**When** the login Server Action runs
**Then** it returns `ActionResult` error with code `UNAUTHORIZED` and the form shows "Invalid email or password" (does not reveal which field is wrong)

**Given** an authenticated user
**When** they log out
**Then** the database session is immediately invalidated and they are redirected to `/login`

**Given** a user account with `deleted_at` set
**When** they attempt to log in
**Then** authentication fails with `UNAUTHORIZED` and no session is created

---

### Story 1.6: RBAC Route & Service-Layer Enforcement

As the system,
I want all routes and mutations protected by role-based access control at both the middleware and service layers,
So that a trainer reaching `/approvals` gets a 403, not a blank screen, and role violations can never silently pass.

**Acceptance Criteria:**

**Given** an authenticated TRAINER
**When** they navigate to `/approvals`, `/trainers`, or `/users`
**Then** the middleware returns 403 before the page renders

**Given** an authenticated SUPERVISOR
**When** they navigate to `/requests` or `/requests/new`
**Then** the middleware returns 403 before the page renders

**Given** any Server Action that performs a mutation
**When** `canActorPerformAction(actor, action, resource)` returns false
**Then** the action returns `ActionResult` error with code `UNAUTHORIZED` — it never silently continues

**Given** `src/lib/errors.ts`
**When** inspected
**Then** it exports all required error code constants: `INVALID_TRANSITION`, `OVERLAP_CONFLICT`, `ENTITLEMENT_LOCKED`, `INSUFFICIENT_BALANCE`, `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`

---

### Story 1.7: Deep-Link Authentication (returnTo Flow)

As a supervisor,
I want email notification links to bring me directly to the target request after I authenticate,
So that I can act on requests without manually navigating to find them.

**Acceptance Criteria:**

**Given** an unauthenticated user who follows a link to `/approvals/abc123`
**When** they log in successfully
**Then** they are redirected to `/approvals/abc123`, not to `/dashboard`

**Given** the login Server Action processes a `returnTo` parameter
**When** the value starts with `http://` or `//`
**Then** it is rejected and the user is redirected to `/dashboard` instead (open-redirect prevention)

**Given** an authenticated user who clicks a deep link
**When** middleware processes the request
**Then** no `returnTo` redirect is applied — they go directly to the requested URL

---

## Epic 2: User & Account Management

Supervisors can manage the club's user base: create/remove trainers and supervisors, assign each trainer to a supervisor, and configure a fallback approver with a mandatory expiry date.

### Story 2.1: Create & Remove User Accounts

As a supervisor,
I want to create trainer and supervisor accounts and remove accounts that are no longer needed,
So that only current club members have access to the system.

**Acceptance Criteria:**

**Given** an authenticated supervisor on the Users page
**When** they submit the Create User form with a name, email, and role (TRAINER or SUPERVISOR)
**Then** the user is created and appears in the user list
**And** the new user can log in with the provided credentials

**Given** a supervisor submits a Create User form with an email already in use
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `VALIDATION_ERROR` and the form shows "An account with this email already exists"

**Given** a supervisor removes a user account
**When** the Server Action runs
**Then** the user's `deleted_at` is set to the current timestamp (soft delete)
**And** the user no longer appears in any active user list
**And** the user's vacation records remain intact in the database

**Given** a soft-deleted user
**When** a supervisor inspects the user list
**Then** only users with `deleted_at IS NULL` are displayed

**Given** an authenticated TRAINER
**When** they attempt to access the Users page
**Then** they receive a 403 (enforced by middleware from Story 1.6)

---

### Story 2.2: Assign Supervisor to Trainer

As a supervisor,
I want to assign a supervisor to each trainer,
So that every trainer has exactly one responsible approver at any time.

**Acceptance Criteria:**

**Given** a supervisor views a trainer's profile or the Users page
**When** they assign a supervisor to that trainer
**Then** the trainer's `supervisor_id` is updated and the new supervisor appears in the trainer's profile

**Given** a trainer already has a supervisor assigned
**When** a different supervisor is assigned
**Then** the previous assignment is replaced (a trainer has exactly one supervisor at any time)

**Given** a supervisor attempts to assign themselves as a trainer's supervisor
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `VALIDATION_ERROR` (a person cannot hold both roles simultaneously)

**Given** a trainer with no supervisor assigned
**When** the Users page is inspected
**Then** the trainer is visually flagged as missing a supervisor assignment

---

### Story 2.3: Configure Fallback Approver

As a supervisor,
I want to designate another supervisor as my fallback approver with a mandatory expiry date,
So that my trainers' pending requests can still be actioned when I am unavailable.

**Acceptance Criteria:**

**Given** an authenticated supervisor on the Users page
**When** they select another supervisor as their fallback and set an expiry date
**Then** a `fallback_approvers` record is created linking the two supervisors with the expiry date
**And** the fallback approver can see and act on the delegating supervisor's trainers' pending requests

**Given** a supervisor submits the fallback config form without an expiry date
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `VALIDATION_ERROR` and the form shows "An expiry date is required"

**Given** a fallback configuration with a past expiry date
**When** the system evaluates the fallback relationship
**Then** the fallback approver no longer has access to the delegating supervisor's requests

**Given** a supervisor views their Users page
**When** an active fallback is configured
**Then** the fallback approver name and expiry date are displayed with a visual "active" indicator

**Given** a supervisor has an existing fallback configured
**When** they submit a new fallback configuration
**Then** the previous fallback record is replaced with the new one

---

### Story 2.4: Fallback Approver Permission Scope

As a fallback approver,
I want to be able to approve or reject pending requests for the delegating supervisor's trainers,
So that I can keep the approval queue moving without gaining broader admin rights.

**Acceptance Criteria:**

**Given** an authenticated supervisor who is an active fallback approver for Supervisor A
**When** they view the approvals queue
**Then** they can see PENDING requests from Supervisor A's trainers alongside their own trainers' requests

**Given** a fallback approver attempts to revoke an APPROVED request for a delegated trainer
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `UNAUTHORIZED` (fallback approvers cannot revoke)

**Given** a fallback approver attempts to set an entitlement for a delegated trainer
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `UNAUTHORIZED` (fallback approvers cannot manage entitlements)

**Given** a fallback approver attempts to manage users on behalf of the delegating supervisor
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `UNAUTHORIZED`

**Given** the fallback configuration has expired
**When** a former fallback approver attempts to approve a request for the previously delegated trainers
**Then** it returns `ActionResult` error with code `UNAUTHORIZED`

---

## Epic 3: Trainer Vacation Request Flows

Trainers can submit vacation requests, save drafts, cancel requests, and track their own balance and history. The core domain engine (state machine, balance service, overlap prevention, cross-year splits, audit logging) is implemented end-to-end.

### Story 3.1: Request State Machine & Core Domain Services

As a developer,
I want the request state machine, balance service, date utilities, and audit service wired up,
So that all subsequent trainer and supervisor stories can rely on a consistent, rule-enforced domain foundation.

**Acceptance Criteria:**

**Given** `src/lib/request-state-machine.ts`
**When** inspected
**Then** the TRANSITIONS table covers all valid transitions (DRAFT→PENDING for TRAINER; PENDING→APPROVED/REJECTED for SUPERVISOR/FALLBACK; PENDING→CANCELLED for TRAINER; APPROVED→CANCELLED for TRAINER; APPROVED→REVOKED for SUPERVISOR)
**And** `canTransition(from, to, actorRole)` returns false for any unlisted transition

**Given** `canTransition` returns false for a given transition
**When** any Server Action attempts the mutation
**Then** it returns `ActionResult` error with code `INVALID_TRANSITION` without touching the database

**Given** `src/lib/date.ts`
**When** inspected
**Then** it exports `formatDate` (outputs "Mon 14 Jul 2026" format), `workingDaysBetween`, and `TZDate` constructors that always use `Europe/Zurich` — never bare `new Date()` in business logic

**Given** `src/lib/services/vacation-balance.service.ts`
**When** `computeBalance(trainerId, year)` is called
**Then** it returns fresh entitlement, carry-over (with expiry), pending days, taken days, and remaining — computed dynamically from request and entitlement records, with no persisted snapshot

**Given** a request that spans December 28–January 3
**When** `computeBalance` calculates days for each year
**Then** December days are deducted from Year N's balance and January days from Year N+1's balance

**Given** `src/lib/services/audit.service.ts`
**When** `log(actorId, action, entityType, entityId, metadata)` is called
**Then** an `audit_logs` record is inserted with the current UTC timestamp
**And** no UPDATE or DELETE is ever issued against that record

---

### Story 3.2: Submit a Vacation Request

As a trainer,
I want to select a date range and submit a vacation request,
So that my supervisor is notified and can review it.

**Acceptance Criteria:**

**Given** an authenticated trainer on the New Request page
**When** they select a start and end date using the DateRangePicker
**Then** the day count updates live below the calendar
**And** any dates already covered by a PENDING or APPROVED request are grayed out and non-selectable

**Given** a trainer selects dates that overlap an existing PENDING or APPROVED request
**When** they attempt to proceed to the confirmation step
**Then** a toast appears: "These dates overlap an existing request. Choose different dates."
**And** the selection is cleared

**Given** a trainer selects valid, non-overlapping dates
**When** they proceed past the DateRangePicker
**Then** a ConfirmationPopup appears showing: selected dates, day count, and remaining balance after this request would be approved

**Given** a trainer confirms submission in the ConfirmationPopup
**When** the `submitRequest` Server Action runs
**Then** a `vacation_requests` record is created with status PENDING
**And** `canTransition(DRAFT, PENDING, TRAINER)` is called before the DB write
**And** an audit log entry is written for this action
**And** a toast confirms: "Request submitted. [Supervisor name] has been notified."

**Given** a trainer submits a request
**When** the page returns to the dashboard
**Then** the new request appears in the trainer's request history with status PENDING

---

### Story 3.3: Save & Manage a Draft Request

As a trainer,
I want to save a vacation request as a draft and return to it later,
So that I can prepare a request without committing to submitting it.

**Acceptance Criteria:**

**Given** a trainer is on the New Request page with dates selected
**When** they click "Save as Draft"
**Then** a `vacation_requests` record is created with status DRAFT
**And** a toast confirms: "Draft saved."
**And** a DraftCard appears on the trainer's Dashboard showing the saved dates and day count

**Given** a trainer views a DraftCard on their Dashboard
**When** they click "Continue"
**Then** the New Request form opens pre-filled with the saved draft dates

**Given** a trainer views a DraftCard on their Dashboard
**When** they click "Delete"
**Then** a confirmation modal asks "Delete this draft? This cannot be undone."
**And** on confirmation the draft record is deleted from the database
**And** the DraftCard is removed from the Dashboard

**Given** a trainer already has a DRAFT request
**When** they navigate to the New Request page
**Then** they are prompted to continue the existing draft or start fresh (two drafts are not created simultaneously)

---

### Story 3.4: Cancel a Pending or Approved Request

As a trainer,
I want to cancel a vacation request that is PENDING or APPROVED,
So that I can withdraw a request I no longer need and free up the balance days.

**Acceptance Criteria:**

**Given** a trainer views a PENDING or APPROVED request in My Requests
**When** they click "Cancel Request"
**Then** a confirmation modal appears: "Cancel this request? This cannot be undone."

**Given** the trainer confirms cancellation
**When** the `cancelRequest` Server Action runs
**Then** `canTransition(current_status, CANCELLED, TRAINER)` is called first
**And** the request status is updated to CANCELLED
**And** an audit log entry is written
**And** a toast confirms: "Request cancelled."

**Given** a request is cancelled
**When** the trainer views their balance
**Then** the previously pending/approved days are no longer counted against their balance

**Given** a trainer attempts to cancel a REJECTED, REVOKED, or CANCELLED request
**When** the Server Action runs
**Then** it returns `ActionResult` error with code `INVALID_TRANSITION` (no cancel button is shown for terminal states)

---

### Story 3.5: Vacation Balance Display & Trainer Dashboard

As a trainer,
I want to see my current vacation balance and all its components on my dashboard,
So that I always know how many days I have available, pending, and taken.

**Acceptance Criteria:**

**Given** an authenticated trainer on the Dashboard
**When** the page loads
**Then** a BalanceCard displays: fresh entitlement, carry-over (with "Expires March 1" label in carry-over accent color), pending days, taken days, and remaining days

**Given** the trainer has carry-over days that have expired (past March 1)
**When** the BalanceCard is displayed
**Then** carry-over shows 0 and the remaining balance reflects only the fresh entitlement

**Given** the BalanceCard
**When** rendered
**Then** a BalanceBar shows the remaining/total ratio as a visual fill bar

**Given** a trainer has no requests and no entitlement set
**When** the Dashboard loads
**Then** an empty state message is shown: "Nothing planned yet. Ready to request time off?" with a Submit Request primary button

**Given** the trainer has a saved DRAFT
**When** the Dashboard loads
**Then** the DraftCard appears below the submit button showing saved dates and day count

---

### Story 3.6: My Requests History View

As a trainer,
I want to view the full history of my vacation requests with their statuses and details,
So that I have a complete record of all requests I have made.

**Acceptance Criteria:**

**Given** an authenticated trainer on the My Requests page
**When** the page loads
**Then** all their requests are displayed in a table: date range, day count, status badge, submission date, and a cancel action (visible only for PENDING or APPROVED)

**Given** the requests table on a mobile viewport
**When** it renders
**Then** the table is horizontally scrollable with the first column (dates) sticky

**Given** a request with status REJECTED or REVOKED
**When** displayed in the history
**Then** the rejection/revocation reason is shown inline below the row

**Given** the trainer has no requests
**When** the My Requests page loads
**Then** an empty state is shown: "No requests yet."

**Given** the page is loading data
**When** the skeleton loading state is active
**Then** skeleton rows are displayed matching the dimensions of a fully loaded table row — no spinner

---

## Epic 4: Supervisor Approval & Entitlement Flows

Supervisors can approve, reject, and revoke vacation requests from their trainers; set and manage annual entitlements within the 10-day grace period; and view trainer balance cards, the approval queue, and full request history. Fallback approver approval/rejection rights are enforced.

### Story 4.1: Approve & Reject Pending Requests

As a supervisor,
I want to approve or reject pending vacation requests from my trainers,
So that I can manage team availability and give trainers a timely decision.

**Acceptance Criteria:**

**Given** an authenticated supervisor on the Approvals page
**When** the page loads
**Then** all PENDING requests from their assigned trainers are listed, with trainer name, dates, day count, and submission date

**Given** a supervisor opens a request detail at `/approvals/:id`
**When** the page loads
**Then** they see: trainer name and avatar initial, requested dates, day count, current balance snapshot showing remaining days after approval, Approve (primary) and Reject (outline danger) buttons

**Given** a supervisor clicks "Approve"
**When** the `approveRequest` Server Action runs
**Then** `canTransition(PENDING, APPROVED, SUPERVISOR)` is called first
**And** the request status is updated to APPROVED
**And** an audit log entry is written
**And** a toast confirms: "Request approved."
**And** the supervisor is returned to `/dashboard`

**Given** a supervisor clicks "Reject"
**When** the rejection reason textarea appears inline
**Then** the supervisor must enter a reason before the "Confirm Rejection" button becomes enabled

**Given** a supervisor confirms rejection with a reason
**When** the `rejectRequest` Server Action runs
**Then** `canTransition(PENDING, REJECTED, SUPERVISOR)` is called first
**And** the request status is updated to REJECTED with the reason stored
**And** an audit log entry is written
**And** a toast confirms: "Request rejected."

**Given** an active fallback approver for this supervisor
**When** they view the Approvals page
**Then** they can see and approve/reject this supervisor's trainers' PENDING requests (scoped per Story 2.4)

---

### Story 4.2: Revoke an Approved Request

As a supervisor,
I want to revoke a previously approved vacation request,
So that I can correct an approval that was granted in error or is no longer viable.

**Acceptance Criteria:**

**Given** a supervisor views an APPROVED request
**When** the page loads
**Then** a "Revoke Approval" button is visible with secondary/destructive styling

**Given** a supervisor clicks "Revoke Approval"
**When** the confirmation modal appears
**Then** it reads "Are you sure? This will revoke the approval. A reason is required." with a reason textarea and Confirm/Cancel actions

**Given** the supervisor enters a reason and confirms
**When** the `revokeRequest` Server Action runs
**Then** `canTransition(APPROVED, REVOKED, SUPERVISOR)` is called first
**And** the request status is updated to REVOKED with the reason stored
**And** an audit log entry is written
**And** a toast confirms: "Approval revoked."
**And** the trainer's balance is recalculated to reflect the freed days

**Given** a supervisor attempts to revoke without entering a reason
**When** they click Confirm
**Then** the modal shows a validation error: "A reason is required" and does not submit

**Given** a fallback approver views an APPROVED request
**When** the page loads
**Then** no Revoke Approval button is shown (fallback approvers cannot revoke)

---

### Story 4.3: Set & Manage Trainer Entitlement

As a supervisor,
I want to set and edit a trainer's annual vacation entitlement within the 10-day grace period,
So that each trainer has the correct number of days allocated for the year.

**Acceptance Criteria:**

**Given** a supervisor opens a trainer's detail page at `/trainers/:id`
**When** no entitlement has been set for the current year
**Then** an editable entitlement field is shown with a Save button

**Given** a supervisor saves an entitlement value
**When** the `setEntitlement` Server Action runs
**Then** an `entitlements` record is created for that trainer and year
**And** an audit log entry is written
**And** a toast confirms: "Entitlement saved."

**Given** the entitlement was set within the last 10 days
**When** the trainer detail page loads
**Then** the entitlement field is editable and shows the remaining days in the grace window

**Given** more than 10 days have passed since the entitlement was first set
**When** the trainer detail page loads
**Then** the entitlement field is read-only with a locked indicator and tooltip: "Entitlement locked after 10-day edit window"

**Given** a supervisor attempts to save an entitlement after the grace period via a direct Server Action call
**When** `entitlement.service.ts` validates the request
**Then** it returns `ActionResult` error with code `ENTITLEMENT_LOCKED`

**Given** an entitlement is set or updated
**When** the trainer views their balance card
**Then** the fresh entitlement figure reflects the new value immediately

---

### Story 4.4: Supervisor Dashboard & Trainer Overview

As a supervisor,
I want a dashboard showing all my trainers' balances and a preview of pending requests,
So that I can quickly assess team availability and action any waiting decisions.

**Acceptance Criteria:**

**Given** an authenticated supervisor on the Dashboard
**When** the page loads
**Then** a grid of TrainerSummaryCards is displayed, one per assigned trainer, each showing: trainer name, BalanceBar (remaining/total), and a pending request count badge (red if > 0)

**Given** a supervisor clicks a TrainerSummaryCard
**When** navigating to `/trainers/:id`
**Then** the trainer's full balance card, entitlement form, and request history are shown

**Given** a supervisor's dashboard with pending requests
**When** the page loads
**Then** a pending queue section shows up to the first 3 PENDING requests with a link to the full Approvals page

**Given** a supervisor's approval queue at `/approvals`
**When** there are no pending requests
**Then** the empty state reads: "No pending requests. Your trainers are all set."

**Given** the dashboard is loading
**When** data is being fetched
**Then** skeleton cards matching TrainerSummaryCard dimensions are shown — no spinner

---

### Story 4.5: Full Request History for Supervisors

As a supervisor,
I want to view the complete request history for all my assigned trainers,
So that I have a full record for reference, auditing, and balance verification.

**Acceptance Criteria:**

**Given** an authenticated supervisor on `/trainers/:id`
**When** the page loads
**Then** all vacation requests for that trainer are listed: dates, day count, final status, timestamp of each state change, and reason for REJECTED and REVOKED

**Given** a request with multiple state changes
**When** displayed in the history
**Then** each transition timestamp is shown in the `Europe/Zurich` timezone in "Mon 14 Jul 2026" format

**Given** the history table on mobile
**When** it renders
**Then** the table is horizontally scrollable with the dates column sticky

**Given** a trainer has no request history
**When** the supervisor views their detail page
**Then** a friendly empty state is shown: "No requests yet for this trainer."

---

## Epic 5: Notifications, Scheduled Jobs & Audit Log Viewer

All lifecycle events trigger dual-channel notifications (in-app + email). Trainers and supervisors can view their notification inbox. Three automated jobs run on schedule (carry-over expiry reminder Feb 1, pending request reminder at 5 working days, fallback approver auto-expiry). Supervisors can view the read-only audit log.

### Story 5.1: Notification Service & Lifecycle Event Delivery

As a club member,
I want to receive an in-app notification and an email whenever a lifecycle event occurs on a vacation request or entitlement,
So that I am always aware of actions that affect me without having to poll the application manually.

**Acceptance Criteria:**

**Given** any state-changing domain service (submitRequest, approveRequest, rejectRequest, cancelRequest, revokeRequest, setEntitlement)
**When** the DB write commits successfully
**Then** `notificationService.send(event, recipients, context)` is called as a side-effect within the service — never from a Server Action directly

**Given** `notificationService.send` is called
**When** it runs
**Then** it inserts a `notifications` record per recipient into the database
**And** it sends an email via Nodemailer to each recipient's email address

**Given** the notification matrix from the PRD (§5.2)
**When** each event occurs
**Then** both the actor (confirmation) and the other party (notification) receive the correct messages per the matrix — including the fallback approver where configured

**Given** a notification email for an approval request
**When** the email is received by the supervisor
**Then** the email body contains a direct link to `/approvals/:id` for deep-link navigation

**Given** Nodemailer fails to send an email
**When** the error is caught
**Then** the domain operation is not rolled back — the DB write and in-app notification stand; the email failure is logged but does not surface as a user-facing error

---

### Story 5.2: In-App Notification Inbox & Unread Badge

As a club member,
I want to view all my in-app notifications in a dedicated inbox and see an unread count badge on the nav icon,
So that I can track what has happened and navigate directly to the relevant request.

**Acceptance Criteria:**

**Given** an authenticated user navigates to `/notifications`
**When** the page loads
**Then** notifications are listed chronologically (newest first), each showing: icon, message text, timestamp in `Europe/Zurich` format, and an unread indicator dot

**Given** a user clicks a notification entry
**When** the entry links to a request
**Then** they are navigated to the relevant `/approvals/:id` or `/requests` URL

**Given** a user clicks "Mark all read"
**When** the action runs
**Then** all notification records for that user are marked as read and unread dots are cleared

**Given** an authenticated user on any page
**When** 30 seconds have elapsed since the last poll
**Then** `GET /api/notifications/unread-count` is called and the nav badge updates to reflect the current unread count

**Given** the unread count is 0
**When** the nav badge renders
**Then** no badge is shown on the notification icon

**Given** the notifications inbox is empty
**When** the page loads
**Then** the empty state reads: "You're all caught up."

---

### Story 5.3: Automated Carry-Over Expiry Reminder

As a trainer,
I want to receive a reminder on February 1 if I have carry-over days that will expire on March 1,
So that I have enough time to use them before they are forfeited.

**Acceptance Criteria:**

**Given** the node-cron job registered in `src/lib/scheduler.ts` fires on February 1
**When** the `/api/cron/carry-over-reminder` route is called
**Then** it queries all trainers with carry-over days remaining for the current year
**And** sends each qualifying trainer an in-app notification and email: "You have {N} carry-over days expiring March 1. Use them before they expire."

**Given** a trainer has 0 carry-over days on February 1
**When** the job runs
**Then** no reminder is sent to that trainer

**Given** the cron job fires
**When** `src/lib/date.ts` helpers determine the policy date
**Then** February 1 is evaluated as `TZDate(year, 1, 1, 'Europe/Zurich')` — never as bare `new Date()`

**Given** the carry-over reminder is sent
**When** the trainer views their notification inbox
**Then** the reminder notification appears with the correct day count and expiry date

---

### Story 5.4: Automated Pending Request Reminder

As a supervisor,
I want to receive a reminder when a trainer's request has been waiting for my decision for 5 working days,
So that no request is accidentally left unreviewed.

**Acceptance Criteria:**

**Given** the node-cron job fires daily
**When** the `/api/cron/pending-reminder` route is called
**Then** it queries all PENDING requests and calculates working days since submission using `workingDaysBetween` from `src/lib/date.ts`
**And** for each request at exactly 5 working days, sends an in-app notification and email to the assigned supervisor and fallback approver if active: "{Trainer name}'s request from {date} is still awaiting your review."

**Given** a request has been PENDING for fewer than 5 working days
**When** the daily job runs
**Then** no reminder is sent for that request

**Given** a request has already had a reminder sent at 5 working days
**When** the job runs again the following day
**Then** no duplicate reminder is sent (reminder is sent once, at the 5-working-day mark only)

**Given** the pending reminder is sent
**When** the supervisor views their notification inbox
**Then** the reminder appears with the trainer's name and original submission date

---

### Story 5.5: Fallback Approver Auto-Expiry Job

As the system,
I want fallback approver configurations to be automatically cleared when their expiry date passes,
So that access is revoked on time without requiring manual intervention.

**Acceptance Criteria:**

**Given** the node-cron job fires daily
**When** the `/api/cron/fallback-expiry` route is called
**Then** it queries all `fallback_approvers` records where `expires_at` is in the past
**And** marks each expired record as inactive

**Given** a fallback configuration is expired and the job has run
**When** the former fallback approver attempts to approve a request for the delegated trainers
**Then** the service layer returns `ActionResult` error with code `UNAUTHORIZED`

**Given** `src/lib/scheduler.ts`
**When** the Next.js server process starts
**Then** all three cron jobs (carry-over reminder, pending reminder, fallback expiry) are registered and scheduled
**And** no job runs more than once per scheduled interval within the same process

---

### Story 5.6: Supervisor Audit Log Viewer

As a supervisor,
I want to view the append-only audit log,
So that I can verify who performed which actions and when, for compliance and accountability purposes.

**Acceptance Criteria:**

**Given** an authenticated supervisor navigates to the audit log page
**When** the page loads
**Then** all audit log entries are displayed in reverse-chronological order: actor name, action, entity type and ID, and timestamp in `Europe/Zurich` format

**Given** the audit log page
**When** a supervisor views it
**Then** there are no Edit or Delete controls — the log is strictly read-only

**Given** an authenticated TRAINER attempts to access the audit log page
**When** middleware processes the request
**Then** they receive a 403

**Given** a state-changing operation was performed in Epics 2, 3, or 4
**When** the supervisor views the audit log
**Then** the corresponding entry is present with the correct actor, action, entity reference, and UTC-stored timestamp displayed in `Europe/Zurich`

**Given** the audit log table on mobile
**When** it renders
**Then** the table is horizontally scrollable with the timestamp column sticky
