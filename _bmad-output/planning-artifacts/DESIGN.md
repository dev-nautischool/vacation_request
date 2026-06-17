---
title: VacationRequest Design System
project: VacationRequest
club: Morges Natation
version: 1.0
date: 2026-06-11
status: final
source: morges-natation.ch/style.css
---

# DESIGN.md — VacationRequest

## Brand & Style

Morges Natation is a Swiss competitive swimming club. The brand is bold, sporty, and direct — red as the driving force, clean white space, sharp edges, no decoration. This internal tool should feel like a natural extension of the club website: recognisable to trainers and supervisors who already know the brand.

Voice: confident, clear, no filler. Action labels are short imperatives. Status labels are plain nouns.

## Colors

```yaml
colors:
  primary: "#e5222d"          # Brand red — CTAs, active states, icons, badges
  primary-dark: "#c33c0d"     # Red hover/pressed state
  primary-darker: "#ab340c"   # Red heading link hover
  on-primary: "#ffffff"       # Text on red backgrounds

  surface: "#ffffff"          # Page and card backgrounds
  surface-gray: "#f6f6f6"     # Alternate row, subtle section bg
  surface-gray-2: "#e3e6e5"   # Input backgrounds, panel headers

  text-primary: "#161618"     # Headlines, strong labels
  text-secondary: "#333333"   # Body headings
  text-body: "#8b8b8b"        # Body copy, secondary labels
  text-muted: "#d1d4d3"       # Disabled, placeholder

  border: "#e3e6e5"           # Input borders, dividers
  border-focus: "#e5222d"     # Input focus ring

  status-pending: "#e5222d"   # Pending badge
  status-approved: "#5cb85c"  # Approved badge (standard success green)
  status-rejected: "#d9534f"  # Rejected badge (standard danger red-dark)
  status-cancelled: "#8b8b8b" # Cancelled badge
  status-revoked: "#333333"   # Revoked badge
  status-draft: "#d1d4d3"     # Draft badge

  carry-over: "#14a5eb"       # Carry-over days accent (distinct from primary)
```

## Typography

```yaml
typography:
  font-heading: "Montserrat, 'Times New Roman', Times, serif"
  font-body: "'Roboto', sans-serif"

  heading-1:
    size: 36px
    weight: 700
    transform: uppercase
    letter-spacing: 0.1em
    color: "{colors.text-primary}"

  heading-2:
    size: 28px
    weight: 700
    color: "{colors.text-secondary}"

  heading-3:
    size: 24px
    weight: 700
    transform: uppercase
    letter-spacing: 0.1em
    color: "{colors.text-secondary}"

  heading-5:
    size: 18px
    weight: 700
    transform: uppercase
    letter-spacing: 0.1em

  body:
    font: "{font-body}"
    size: 14px
    weight: 400
    line-height: 1.43
    color: "{colors.text-body}"

  label:
    font: "{font-heading}"
    size: 14px
    weight: 700
    transform: uppercase
    letter-spacing: 0.15em

  small:
    size: 12px
    display: block
```

## Layout & Spacing

- Base unit: 8px
- Container max-width: 1200px, centered, 15px horizontal padding
- Card padding: 20px mobile / 35px desktop
- Section vertical padding: 50px mobile / 90px desktop
- Grid: 12-column flex grid inherited from brand system

## Elevation & Depth

No shadows on cards — flat design consistent with the club site. Borders (`1px solid {colors.border}`) define card edges. Active/hover states use border-color change to `{colors.primary}`.

## Shapes

- Border radius: **0** everywhere (sharp corners, consistent with club site)
- Buttons: 0 border-radius, 2px solid border
- Inputs: 0 border-radius, 2px solid border
- Cards: 0 border-radius

## Components

### Buttons

```yaml
button-primary:
  background: "{colors.primary}"
  color: "{colors.on-primary}"
  border: "2px solid {colors.primary}"
  hover:
    background: "{colors.primary-dark}"
    border-color: "{colors.primary-dark}"
  font: "{typography.label}"
  padding: "13px 22px"
  radius: 0

button-outline:
  background: transparent
  color: "{colors.primary}"
  border: "2px solid {colors.primary}"
  hover:
    background: "{colors.primary}"
    color: "{colors.on-primary}"
  font: "{typography.label}"
  padding: "13px 22px"
  radius: 0

button-secondary:
  background: transparent
  color: "{colors.text-primary}"
  border: "2px solid {colors.border}"
  hover:
    background: "{colors.text-primary}"
    color: "{colors.on-primary}"
  font: "{typography.label}"

button-danger:
  background: transparent
  color: "{colors.status-rejected}"
  border: "2px solid {colors.status-rejected}"
  hover:
    background: "{colors.status-rejected}"
    color: "{colors.on-primary}"
```

### Status Badge

Inline pill — uppercase Montserrat 11px, 2px solid border, no fill, matching status color for both text and border.

### Cards

White background, 1px border (`{colors.border}`), hover state changes border to `{colors.primary}`. No shadow.

### Form Inputs

Height 50px, 2px border (`{colors.border}`), focus border `{colors.primary}`, border-radius 0. Floating label pattern. Font Roboto 14px, color `{colors.text-body}`.

### Toast Notifications

Dark background (`{colors.text-primary}`), white text, positioned bottom-left. Max-width 380px. Auto-dismiss after 4s. Types: default, success (green left border), error (red left border).

### Calendar Widget

Two-month date range picker (EasyJet-style). Blocked dates visually grayed and non-selectable. Selected range highlighted in `{colors.primary}` with lighter fill between start/end dates.

### Notification Inbox Badge

Red circle badge on nav notification icon showing unread count. Badge color `{colors.primary}`.

## Do's and Don'ts

**Do:**
- Use Montserrat bold uppercase for all action labels and section headings
- Use `{colors.primary}` red only for interactive and status elements — not decorative
- Keep cards flat with border, not shadowed
- Use sharp 0-radius corners everywhere

**Don't:**
- Round any corners
- Use more than two font families
- Use red for body text
- Add decorative imagery — this is a functional internal tool
