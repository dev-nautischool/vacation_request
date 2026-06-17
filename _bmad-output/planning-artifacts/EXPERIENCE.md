---
title: VacationRequest UX Experience
project: VacationRequest
club: Morges Natation
version: 1.0
date: 2026-06-11
status: final
references: DESIGN.md, prd.md
---

# EXPERIENCE.md — VacationRequest

## Foundation

- **Form factor:** Responsive web — desktop + mobile browser. No native apps.
- **Visual identity:** See DESIGN.md. All visual tokens referenced as `{colors.*}`, `{typography.*}`.
- **UI system:** Custom, derived from Morges Natation brand (morges-natation.ch).
- **Language:** English only.
- **Users:** Trainer role and Supervisor role (mutually exclusive). Dynamically managed.

---

## Information Architecture

### Trainer Navigation
```
Dashboard          — balance summary + draft requests + submit button
My Requests        — full request history + status filters
Notifications      — in-app notification inbox
```

### Supervisor Navigation
```
Dashboard          — trainer summary cards + pending queue preview
Approvals          — full pending request queue
Trainers           — per-trainer balance view + entitlement management
Users              — user management + fallback approver config
Notifications      — in-app notification inbox
```

### Route Map
| Path | Role | View |
|------|------|------|
| `/dashboard` | Trainer | Balance summary, draft card, submit button |
| `/dashboard` | Supervisor | Trainer cards grid, pending queue |
| `/requests` | Trainer | My request history |
| `/requests/new` | Trainer | New request form |
| `/approvals` | Supervisor | Pending queue |
| `/approvals/:id` | Supervisor | Request detail card |
| `/trainers` | Supervisor | Trainer list with balances |
| `/trainers/:id` | Supervisor | Trainer detail + entitlement form |
| `/users` | Supervisor | User management |
| `/notifications` | Both | Notification inbox |
| `/login` | Both | Login screen |

---

## Voice and Tone

- **Action labels:** Short imperatives. "Submit Request", "Approve", "Reject", "Save Draft", "Revoke".
- **Status labels:** Plain nouns. "Pending", "Approved", "Rejected", "Cancelled", "Revoked", "Draft".
- **Confirmation messages:** Direct and complete. "Your request has been submitted. Alessandro will review it shortly."
- **Error messages:** State what happened and what to do. "These dates overlap an existing request. Choose different dates."
- **Empty states:** Friendly and action-oriented. "No pending requests. Your trainers are all set."

---

## Component Patterns

### Balance Card (Trainer)
Displays on trainer Dashboard and in supervisor's trainer detail view.

| Field | Description |
|-------|-------------|
| Fresh entitlement | Days allocated for current year |
| Carry-over | Rolled-over days from prior year, with expiry date label |
| Pending | Days in PENDING or APPROVED future requests |
| Taken | Days in past APPROVED periods |
| Remaining | (Fresh + Carry-over) − (Pending + Taken) |

Carry-over days use `{colors.carry-over}` accent to visually distinguish from fresh days. Expiry date shown inline: "Expires March 1".

### Request Card (Supervisor Approval Queue)
Displayed in `/approvals/:id`. Contains:
- Trainer name + avatar initial
- Requested dates (formatted: "Mon 14 Jul – Fri 18 Jul 2026")
- Day count
- Current balance snapshot: remaining after approval
- Status badge
- Approve button (primary) + Reject button (outline danger)
- Rejection reason textarea (shown only when Reject is clicked)
- Revoke button (shown only on APPROVED requests, secondary/destructive)

### Trainer Summary Card (Supervisor Dashboard)
Grid of cards, one per assigned trainer. Shows:
- Trainer name
- Balance bar (remaining / total as visual fill)
- Pending request count badge (red if > 0)
- Quick link to trainer detail

### Request History Row (Trainer — My Requests)
Table row: dates | days | status badge | submitted date | action (cancel if PENDING or APPROVED)

### Draft Card (Trainer Dashboard)
Inline card below submit button. Shows saved draft dates and day count. Buttons: "Continue" (opens request form prefilled) and "Delete".

---

## State Patterns

### Request States
| State | Badge color | Actor actions available |
|-------|-------------|------------------------|
| DRAFT | `{colors.status-draft}` | Trainer: submit, delete |
| PENDING | `{colors.status-pending}` | Trainer: cancel. Supervisor/Fallback: approve, reject |
| APPROVED | `{colors.status-approved}` | Trainer: cancel. Supervisor: revoke |
| REJECTED | `{colors.status-rejected}` | Read-only + reason shown |
| CANCELLED | `{colors.status-cancelled}` | Read-only |
| REVOKED | `{colors.status-revoked}` | Read-only + reason shown |

### Empty States
- Trainer Dashboard, no requests: "Nothing planned yet. Ready to request time off?" + Submit button.
- Supervisor Approvals, empty queue: "No pending requests. Your trainers are all set."
- Notifications inbox, empty: "You're all caught up."

### Loading States
Skeleton placeholders for cards and tables. No spinners except for form submission actions.

### Error States
- Overlapping dates: calendar blocks dates visually (grayed, non-selectable). Toast: "These dates overlap an existing request."
- Form validation: inline error below field, red border on input.
- Network error: toast error, retry button where applicable.

---

## Interaction Primitives

### Submit Vacation Request Flow (Trainer — Marco)
1. Marco lands on Dashboard. Sees balance card and "Request Vacation" primary button.
2. Clicks button → opens `/requests/new` or modal with date range picker.
3. **Date range picker:** Two-month calendar (EasyJet-style). Existing PENDING/APPROVED dates grayed and blocked. Selected range highlights in `{colors.primary}`.
4. Selects start and end date. Day count updates live below calendar.
5. If selected range overlaps blocked dates → toast warning, selection cleared.
6. **Confirmation popup** appears with:
   - Selected dates
   - Day count
   - Balance remaining after approval
   - "Confirm & Submit" (primary button)
   - "Back" (secondary button — returns to calendar)
7. On confirm → request created as PENDING. Toast: "Request submitted. Alessandro has been notified." Email sent to supervisor.
8. On "Save as Draft" (secondary button on date picker step) → request saved as DRAFT. Toast: "Draft saved." Draft card appears on Dashboard.

### Approve / Reject Flow (Supervisor — Alessandro)
1. Alessandro receives email notification with link to request.
2. Email link deep-links directly to the request. If the supervisor is not logged in, they authenticate and are redirected to that exact request URL.
3. Lands on `/approvals/:id` request card.
4. Reviews: trainer name, dates, day count, remaining balance after approval.
5. Clicks "Approve" → request moves to APPROVED. Toast confirmation. Trainer notified by email + in-app.
6. Clicks "Reject" → rejection reason textarea appears inline. Must enter reason. Clicks "Confirm Rejection" → request moves to REJECTED. Toast confirmation. Trainer notified.
7. After approving or rejecting, Alessandro is returned to `/dashboard`.

### Revoke Flow (Supervisor)
1. Supervisor opens an APPROVED request.
2. "Revoke Approval" button visible (secondary/destructive styling).
3. Clicks → confirmation modal: "Are you sure? This will revoke the approval. A reason is required."
4. Enters reason → confirms → request moves to REVOKED. Trainer notified.

### Cancel Flow (Trainer)
1. Trainer views a PENDING or APPROVED request in My Requests.
2. "Cancel Request" button visible.
3. Clicks → confirmation modal: "Cancel this request? This cannot be undone."
4. Confirms → request moves to CANCELLED. Supervisor notified.

### Set Entitlement Flow (Supervisor)
1. Supervisor opens `/trainers/:id`.
2. Sees current year entitlement field. If within 10-day grace period: field is editable.
3. Edits value → saves → trainer notified by email + in-app.
4. After grace period: field is read-only, locked indicator shown. Tooltip: "Entitlement locked after 10-day edit window."

---

## Accessibility Floor

- All interactive elements keyboard-navigable (Tab, Enter, Space, Escape for modals).
- Color is never the only differentiator — status badges include text label, not just color.
- Form inputs have visible labels (not placeholder-only).
- Toast notifications announced to screen readers via ARIA live region.
- Minimum touch target: 44×44px on mobile.
- Focus ring visible on all interactive elements (2px `{colors.primary}` outline).

---

## Key Flows Summary

| Flow | Entry | Climax | Exit |
|------|-------|--------|------|
| Submit request | Dashboard button | Confirmation popup → submit | Toast + return to dashboard |
| Save draft | Date picker | Save as Draft button | Toast + draft card on dashboard |
| Approve request | Email link / approval queue | Approve button on request card | Toast + return to dashboard |
| Reject request | Approval queue | Rejection reason + confirm | Toast + trainer notified |
| Revoke approval | Request detail | Revoke modal + reason | Toast + trainer notified |
| Cancel request | My Requests | Cancel confirmation modal | Toast + supervisor notified |
| Set entitlement | Trainer detail | Save entitlement | Toast + trainer notified |

---

## Responsive & Platform

- **Mobile-first layout:** Single column, full-width cards, bottom-anchored primary actions.
- **Desktop:** Two-column dashboard (balance card left, request queue right for supervisor). Trainer cards in 2–3 column grid.
- **Date picker:** Full-screen modal on mobile. Inline panel on desktop.
- **Navigation:** Bottom tab bar on mobile. Left sidebar or top nav on desktop.
- **Tables:** Horizontally scrollable on mobile with sticky first column.

---

## Notifications

### In-App Notification Inbox (`/notifications`)
- Chronological list, newest first.
- Each entry: icon (action type) + message text + timestamp + unread indicator dot.
- "Mark all read" button at top.
- Clicking an entry deep-links to the relevant request.
- Unread count badge on nav notification icon.

### Toast Alerts
- Appear bottom-left, stack vertically if multiple.
- Auto-dismiss after 4 seconds.
- Types: default (dark), success (green left border), error (red left border), warning (orange left border).
- Manual dismiss X button.
- Screen-reader announced via ARIA live region (role="status").

### Automated Reminder Notifications
- **Carry-over expiry:** February 1 — in-app + email to trainer. Message: "You have {N} carry-over days expiring March 1. Use them before they expire."
- **Pending request reminder:** After 5 working days without decision — in-app + email to supervisor (and fallback if configured). Message: "{Trainer name}'s request from {date} is still awaiting your review."

---

