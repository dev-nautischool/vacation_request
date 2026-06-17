---
title: VacationRequest PRD
project: VacationRequest
club: Morges Natation
version: 1.0
date: 2026-06-11
status: final
stakes: internal-compliance
---

# Product Requirements Document — VacationRequest
**Morges Natation — Trainer Vacation Management Web App**

---

## 1. Purpose

VacationRequest is a web and mobile application that formalises the vacation lifecycle for professional trainers at Morges Natation. It replaces informal communication and manual tracking with a structured request-approval workflow, accurate balance management, and a compliant audit trail.

---

## 2. Users & Roles

### 2.1 Trainer
- A professional employee of the club with a formal employment contract.
- Has a single assigned supervisor.
- Can: submit, save, and cancel vacation requests; view their own balance and request history.
- Cannot: view other trainers' data; approve any requests; manage users or entitlements.

### 2.2 Supervisor
- A member of the club committee responsible for one or more trainers.
- Has admin rights.
- Can: approve, reject (with reason), or revoke requests for their assigned trainers; set and update annual entitlements; manage users (add/remove trainers and supervisors, assign supervisors to trainers); configure fallback approvers.
- Cannot: submit vacation requests for themselves via this tool (supervisor vacations are out of scope).

### 2.3 Fallback Approver
- A supervisor designated as a temporary delegate for another supervisor.
- Limited rights: can approve or reject **pending requests only** for the delegating supervisor's trainers.
- Cannot revoke, manage entitlements, or manage users on behalf of the delegating supervisor.

### 2.4 Role Constraints
- A person holds either the Trainer role or the Supervisor role — never both.
- A trainer has exactly one supervisor at any time.
- A supervisor may be assigned to multiple trainers.
- Both roles are dynamically managed (users can be added/removed at any time).

---

## 3. Vacation Request Lifecycle

### 3.1 States

| State | Description |
|-------|-------------|
| `DRAFT` | Saved by trainer, not yet submitted |
| `PENDING` | Submitted, awaiting supervisor decision |
| `APPROVED` | Approved by supervisor or fallback approver |
| `REJECTED` | Rejected by supervisor or fallback approver |
| `CANCELLED` | Cancelled by trainer |
| `REVOKED` | Revoked by supervisor after approval |

### 3.2 Transitions

| From | To | Actor | Condition |
|------|----|-------|-----------|
| — | `DRAFT` | Trainer | Saves without submitting |
| `DRAFT` | `PENDING` | Trainer | Submits request |
| `DRAFT` | — | Trainer | Deletes draft |
| `PENDING` | `APPROVED` | Supervisor / Fallback | No condition |
| `PENDING` | `REJECTED` | Supervisor / Fallback | Reason required |
| `PENDING` | `CANCELLED` | Trainer | No condition |
| `APPROVED` | `CANCELLED` | Trainer | No condition |
| `APPROVED` | `REVOKED` | Supervisor | Reason required |

### 3.3 Resubmission
After a rejection or revocation, the trainer may immediately resubmit a request for the same or overlapping dates. No waiting period is enforced.

### 3.4 Overlap Prevention
The system blocks submission of a new request (from `DRAFT` to `PENDING`) if the requested dates overlap with any existing `PENDING` or `APPROVED` request for the same trainer.

### 3.5 Cross-Year Requests
When a request spans two calendar years, days are deducted from the balance of the year in which they fall (e.g. Dec 28–Jan 3 deducts Dec days from Year N, Jan days from Year N+1).

---

## 4. Vacation Balance & Entitlement

### 4.1 Entitlement Setting
- Entitlements are set **manually** by the assigned supervisor, once per calendar year (January 1 – December 31) per trainer.
- A supervisor may edit the entitlement within a **10-day grace period** from the date it was first set. After the grace period it is locked.
- If a contract amendment requires a change after the lock, this is handled via a change request (out of scope for v1).

### 4.2 Carry-Over
- Unused days from Year N automatically roll over to Year N+1 and are explicitly labelled as **carry-over** in the balance display.
- Carry-over days expire on **March 1** of Year N+1. This is a fixed club policy date, independent of when the supervisor set the entitlement. Any unused carry-over is forfeited after this date.

### 4.3 Balance Display
Each trainer's balance shows:
- **Fresh entitlement** — days allocated for the current year
- **Carry-over** — rolled-over days from the previous year (with expiry date)
- **Pending** — days in `PENDING` or `APPROVED` requests not yet taken
- **Taken** — days in completed (past) `APPROVED` periods
- **Remaining** — (Fresh entitlement + Carry-over) − (Pending + Taken)

### 4.4 Visibility
- **Trainer**: sees their own balance only.
- **Supervisor**: sees the balance of all their assigned trainers.

---

## 5. Notifications

### 5.1 Notification Rule
Every lifecycle event generates:
- A **confirmation** to the actor (the person who performed the action).
- A **notification** to the other involved party (the person affected by the action).

Both are delivered via **in-app notification** and **email**.

### 5.2 Notification Matrix

| Event | Confirmation (actor) | Notification (other party) |
|-------|---------------------|---------------------------|
| Draft saved | Trainer | — |
| Request submitted | Trainer | Supervisor (+ fallback if configured) |
| Request approved | Supervisor / Fallback | Trainer |
| Request rejected | Supervisor / Fallback | Trainer |
| Request cancelled | Trainer | Supervisor (+ fallback if configured) |
| Request revoked | Supervisor | Trainer |
| Entitlement set / updated | Supervisor | Trainer |

### 5.3 Automated Reminders
- **Carry-over expiry reminder**: sent to the trainer on **February 1** if they have carry-over days remaining. Message includes the number of days and expiry date (March 1).
- **Pending request reminder**: sent to the supervisor (and fallback approver if configured) if a request has been in `PENDING` state for **5 working days** without a decision.

---

## 6. Dashboard & History

### 6.1 Trainer Dashboard
- Balance summary (see §4.3).
- List of their own requests with status, dates, and (where applicable) rejection/revocation reason.
- Ability to submit a new request or open a draft.

### 6.2 Supervisor Dashboard
- Per-trainer balance cards for all assigned trainers.
- Approval queue: all `PENDING` requests awaiting action.
- Full request history for all assigned trainers.

### 6.3 History View
Available to both roles (scoped per §6.1 and §6.2). Displays all requests with:
- Trainer name
- Requested dates
- Days count
- Final status
- Timestamp of each state change
- Reason (for `REJECTED` and `REVOKED`)

---

## 7. User Management

Supervisors (admins) can:
- Add and remove trainer accounts.
- Add and remove supervisor accounts.
- Assign a supervisor to a trainer (one supervisor per trainer).
- Configure a fallback approver for themselves (another supervisor in the system), with a mandatory expiry date. The fallback is automatically cleared when the expiry date passes.
- Fallback configuration is per supervisor, not per request.

---

## 8. Authentication

- Email and password login.
- Accounts are created manually by a supervisor/admin.
- No MFA, no magic link, no social login (v1).
- Session management follows standard web security practices.

> **[CHANGE REQUEST]** Auth method, password reset flow, and MFA are explicitly deferred and should be revisited before any public or broader rollout.

---

## 9. Audit Log

The application maintains an internal audit log, visible to supervisors, recording:
- Who performed each action (user ID + name)
- What action was taken
- On which record (request ID or user ID)
- Timestamp

The audit log is read-only and cannot be edited or deleted.

---

## 10. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Data retention | Vacation records and audit log retained for **5 years** (Swiss employment law compliance) |
| Availability | Targeted for business hours (9:00–17:00); scheduled downtime outside hours is acceptable |
| Hosting | Local machine (development/v1 deployment) |
| Audit trail | Internal audit log as per §9 |
| Language | English only |
| Platform | Responsive web application (desktop + mobile browser); no native apps |

> **[CHANGE REQUEST]** Hosting should be migrated to a cloud provider before use beyond a single machine.

---

## 11. Out of Scope (v1)

- Supervisor vacation management
- Password reset / self-service account recovery
- MFA or SSO
- Integration with payroll or external HR systems
- Leave types other than vacation (sick leave, unpaid leave, etc.)
- Native mobile apps (iOS / Android)
- Multi-language support
- Automated entitlement calculation
- Cloud hosting
- Entitlement amendments after the 10-day grace period

---


*Input: `_bmad-output/planning-artifacts/brief.md`*
*Output: `_bmad-output/planning-artifacts/prd.md`*
