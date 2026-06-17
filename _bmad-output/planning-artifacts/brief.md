# Product Brief — VacationRequest
**Morges Natation — Trainer Vacation Management Web App**
*Version 1.0 — 2026-06-11*

---

## Executive Summary

Morges Natation is a Swiss swimming club with professional trainers employed under formal contracts. Those contracts entitle each trainer to a variable number of vacation days, determined annually by their supervisor based on sex, age, and seniority. Today there is no dedicated tool to manage this process — requests, approvals, and balance tracking are handled informally.

VacationRequest is a web and mobile application that formalises the entire vacation lifecycle: trainers submit requests, supervisors approve or reject them, and both parties can always see current balances at a glance. The system is designed for the club's current three trainers but scales as the club grows.

---

## The Problem

Trainers have contractual vacation entitlements but no structured way to request time off or track what they have used. Supervisors have no central record of requests, approvals, or remaining balances. This creates administrative friction, risk of disputes, and no audit trail for compliance with employment contracts.

**Affected users:** professional trainers and their supervisors (committee members).
**Current workaround:** informal communication (email, verbal), manual tracking in spreadsheets or paper.
**Consequence:** errors in balance tracking, no formal approval record, no visibility for either party.

---

## The Solution

A responsive web application (desktop + mobile) where:

- **Trainers** submit vacation requests, view their balance (available days, taken days, rolled-over days), and cancel pending or approved requests.
- **Supervisors** review requests, approve or reject with a mandatory reason on rejection, revoke previously approved requests, and set each trainer's annual entitlement.
- **Both roles** receive real-time in-app and email notifications for every state change (submitted, approved, rejected, cancelled, revoked).

Supervisors hold admin rights and can manage the user roster (add/remove trainers and supervisors) and configure fallback approvers for when a supervisor is unavailable.

Vacation balances are set manually by each supervisor at the start of the year. Unused days roll over to the next year and are explicitly labelled as carry-over so they are distinguishable from fresh entitlement.

---

## What Makes This Different

This is purpose-built for a small sports club with a formal employment structure — not a generic HR tool. It is lightweight, requires no IT department to operate, and maps directly to the club's contractual obligations. Supervisors who are not technically skilled can manage the full system without training.

---

## Who This Serves

**Primary — Trainers (3, scalable)**
Professional employees with contractual vacation rights. They want a simple, transparent way to request time off and always know exactly how many days they have left, including carry-over.

**Primary — Supervisors / Committee Members**
Responsible for approving requests and setting entitlements. They want a clear approval queue, the ability to delegate when absent, and a reliable record they can refer to if disputes arise.

---

## Success Criteria

- Zero vacation requests processed outside the system within 3 months of launch.
- Every trainer can state their exact available balance (including carry-over) without asking a supervisor.
- Every approval or rejection has a timestamped, retrievable audit record.
- Fallback approver coverage means no request sits unreviewed for more than 5 business days due to supervisor absence.

---

## Scope (Version 1)

**In scope:**
- Trainer vacation request submission, cancellation
- Supervisor approval, rejection (with reason), revocation
- Annual entitlement management (manual entry per trainer per year)
- Carry-over day tracking (explicitly labelled)
- Balance dashboard (days taken, days remaining, carry-over breakdown)
- In-app + email notifications for all lifecycle events
- Fallback approver configuration per supervisor
- User management (add/remove trainers and supervisors, dynamic)
- Responsive design (web + mobile browser)

**Out of scope (v1):**
- Supervisor vacation management
- Integration with payroll or external HR systems
- Leave types other than vacation (sick leave, unpaid leave, etc.)
- Native mobile apps (iOS/Android)
- Multi-language support (English only)
- Automated entitlement calculation (manual entry only)

---

## Vision (2–3 Years)

If successful, VacationRequest becomes the single source of truth for all employment-related time-off at Morges Natation, potentially expanding to cover other leave types and integrating with the club's broader administrative tools. The model could be packaged and offered to other small Swiss sports clubs facing the same HR compliance challenges.

---

*Output location: `_bmad-output/planning-artifacts/brief.md`*
