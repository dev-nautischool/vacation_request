---
story_key: 1-3-design-token-system-and-ui-primitives
epic: 1
story: 3
baseline_commit: 43c33246ce84ff6ddd8846d5492c330dd2299cfd
---

# Story 1.3: Design Token System & UI Primitives

Status: review

## Story

As a developer,
I want the Morges Natation design token system and all primitive UI components implemented,
so that every feature story can use consistent, brand-aligned building blocks without making local styling decisions.

## Acceptance Criteria

1. **Given** `src/app/globals.css`  
   **When** inspected  
   **Then** all DESIGN.md tokens are defined as CSS custom properties: `--color-primary`, `--color-surface`, `--color-border`, all six `--color-status-*` variants, `--color-carry-over`, and all `--color-text-*` variants

2. **Given** the Button component rendered with any of the four variants (primary, outline, secondary, danger)  
   **When** displayed  
   **Then** each matches DESIGN.md: correct background/border/hover colors, Montserrat uppercase bold font, 13px 22px padding, 0 border-radius

3. **Given** the Badge component rendered with any of the six statuses (DRAFT, PENDING, APPROVED, REJECTED, CANCELLED, REVOKED)  
   **When** displayed  
   **Then** it shows the matching status color for both text and border, and always includes the text label (color is never the only differentiator)

4. **Given** the Input component  
   **When** focused  
   **Then** height is 50px, border is 2px, border-radius is 0, the floating label is visible, and the border color changes to `--color-primary`

5. **Given** the Toast component  
   **When** triggered  
   **Then** it appears bottom-left, auto-dismisses after 4 seconds, supports manual X dismiss, and announces via `role="status"` ARIA live region

6. **Given** the Skeleton component  
   **When** rendered  
   **Then** it provides card-shaped and table-row-shaped variants that match the dimensions of the content they replace

7. **Given** any page that uses Montserrat or Roboto  
   **When** network requests are inspected  
   **Then** fonts are self-hosted with no external font requests (via next/font/google which pre-fetches at build time)

## Tasks / Subtasks

- [x] Task 1: Install test dependencies and update vitest config (AC: all)
  - [x] Install @testing-library/react, @testing-library/jest-dom, jsdom as dev deps
  - [x] Install @testing-library/user-event
  - [x] Update vitest.config.ts to use jsdom environment with globals: true
  - [x] Add jest-dom setup file (src/test/setup.ts using vitest import)

- [x] Task 2: Update globals.css with design tokens (AC: 1)
  - [x] Add all color CSS custom properties from DESIGN.md
  - [x] Add typography custom properties (--font-heading, --font-body)
  - [x] Register Tailwind @theme inline tokens
  - [x] Set base body/html/heading styles
  - [x] Global border-radius: 0 for sharp corners

- [x] Task 3: Update layout.tsx with Montserrat + Roboto fonts (AC: 7)
  - [x] Replace Geist fonts with Montserrat (700) + Roboto (400) via next/font/google
  - [x] Expose fonts as CSS variables --font-montserrat and --font-roboto
  - [x] Update metadata title to VacationRequest — Morges Natation

- [x] Task 4: Create Button component (AC: 2)
  - [x] Write failing tests first
  - [x] Implement Button with 4 variants: primary, outline, secondary, danger
  - [x] Verify 5 tests pass

- [x] Task 5: Create Badge component (AC: 3)
  - [x] Write failing tests first
  - [x] Implement Badge with 6 status variants + data-status attribute
  - [x] Verify 3 tests pass

- [x] Task 6: Create Card component
  - [x] Write failing tests first
  - [x] Implement Card with flat design, 1px border, hover border-primary
  - [x] Verify 3 tests pass

- [x] Task 7: Create Input component (AC: 4)
  - [x] Write failing tests first
  - [x] Implement Input with floating label, 50px height, 0 border-radius
  - [x] Verify 5 tests pass

- [x] Task 8: Create Modal component
  - [x] Write failing tests first
  - [x] Implement Modal with overlay, backdrop click dismiss, Escape key dismiss
  - [x] Verify 4 tests pass

- [x] Task 9: Create Toast system (AC: 5)
  - [x] Write failing tests first
  - [x] Implement Toast + ToastProvider + useToast hook
  - [x] Bottom-left positioning, 4s auto-dismiss, ARIA role="status", X dismiss
  - [x] Verify 4 tests pass (used fireEvent + vi.useFakeTimers for auto-dismiss)

- [x] Task 10: Create Skeleton component (AC: 6)
  - [x] Write failing tests first
  - [x] Implement Skeleton with card and table-row variants
  - [x] Verify 4 tests pass

- [x] Task 11: Create barrel export and run full test suite
  - [x] Create src/components/ui/index.ts
  - [x] Run all tests: 36 passed (9 test files)
  - [x] Run type check: npx tsc --noEmit — clean
  - [x] Run lint: npm run lint — clean

## Dev Notes

- Tailwind CSS v4 — tokens go in CSS via `@theme inline` directive
- Used next/font/google for Montserrat + Roboto — self-hosts at build time; no external browser requests
- Global `border-radius: 0 !important` in globals.css enforces sharp corners across all elements
- Toast tests require `fireEvent` instead of `userEvent` when `vi.useFakeTimers()` is active (userEvent async hangs with fake timers)
- vitest `globals: true` is required for @testing-library/react auto-cleanup between tests

## Dev Agent Record

### Implementation Plan
Installed @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom as devDependencies.
Updated vitest.config.ts: jsdom environment, globals: true, setupFiles pointing to src/test/setup.ts.
Setup file imports @testing-library/jest-dom/vitest (not the default index — Vitest compatibility export).
Design tokens implemented as CSS custom properties in :root block + @theme inline for Tailwind utilities.
Fonts switched from Geist to Montserrat (700) + Roboto (400) via next/font/google with CSS variable exposure.
All 7 components created in src/components/ui/ with co-tested .test.tsx files.

### Debug Log
- jest-dom default import fails in vitest (expect not defined) — fixed by importing from @testing-library/jest-dom/vitest
- vitest missing globals: true caused DOM accumulation across tests (multiple elements found) — fixed with globals: true
- Toast tests timed out with userEvent.setup + fake timers — fixed by switching to fireEvent for click interactions

### Completion Notes
All 36 tests pass across 9 test files. TypeScript type-check clean. ESLint clean.

Pre-existing issue noted: src/middleware.ts imports Prisma via auth.ts, which is incompatible with Edge Runtime. This manifests as a 500 on all routes in dev. Tracked in deferred-work.md — scope is Story 1.6.

## File List

- `src/app/globals.css` — replaced with full design token system + base styles
- `src/app/layout.tsx` — Geist → Montserrat + Roboto via next/font/google
- `src/test/setup.ts` — new: jest-dom/vitest setup for test suite
- `vitest.config.ts` — jsdom environment, globals: true, setupFiles
- `src/components/ui/Button.tsx` — new: 4 variants
- `src/components/ui/Button.test.tsx` — new: 5 tests
- `src/components/ui/Badge.tsx` — new: 6 status variants
- `src/components/ui/Badge.test.tsx` — new: 3 tests
- `src/components/ui/Card.tsx` — new: flat card with hover border
- `src/components/ui/Card.test.tsx` — new: 3 tests
- `src/components/ui/Input.tsx` — new: floating label, 50px height
- `src/components/ui/Input.test.tsx` — new: 5 tests
- `src/components/ui/Modal.tsx` — new: overlay, keyboard + backdrop dismiss
- `src/components/ui/Modal.test.tsx` — new: 4 tests
- `src/components/ui/Toast.tsx` — new: ToastProvider + useToast hook
- `src/components/ui/Toast.test.tsx` — new: 4 tests
- `src/components/ui/Skeleton.tsx` — new: card + table-row variants
- `src/components/ui/Skeleton.test.tsx` — new: 4 tests
- `src/components/ui/index.ts` — new: barrel export
- `_bmad-output/implementation-artifacts/deferred-work.md` — updated with middleware Edge Runtime issue
- `.claude/launch.json` — new: preview server config

## Change Log

- 2026-06-17: Story 1.3 implemented — design tokens, Montserrat/Roboto fonts, 7 UI primitive components, 36 tests passing
