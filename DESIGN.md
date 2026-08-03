---
name: "Procurement Control Center"
description: "A formal Thai document-control workspace that makes every request, owner, state, and next action legible."
colors:
  ink: "#171b20"
  graphite: "#18232d"
  paper: "#fffdf9"
  paper-warm: "#f7f3ec"
  line: "#c7c4bd"
  line-dark: "#6b7075"
  safety-orange: "#c2410c"
  safety-orange-deep: "#9a3412"
  safety-orange-soft: "#fff0e7"
  success: "#18794e"
  success-soft: "#eaf7ef"
  danger: "#b42318"
  danger-soft: "#fff0ee"
  warning: "#9a5b00"
  warning-soft: "#fff5db"
  info: "#175cd3"
  info-soft: "#eff5ff"
  focus: "#005fcc"
  white: "#ffffff"
typography:
  display:
    fontFamily: 'var(--font-sarabun), "Sarabun", sans-serif'
    fontSize: "clamp(1.55rem, 3vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  headline:
    fontFamily: 'var(--font-sarabun), "Sarabun", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  title:
    fontFamily: 'var(--font-sarabun), "Sarabun", sans-serif'
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  body:
    fontFamily: 'var(--font-sarabun), "Sarabun", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'var(--font-sarabun), "Sarabun", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
rounded:
  square: "0px"
  full: "9999px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.safety-orange}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.safety-orange-deep}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.white}"
    textColor: "{colors.danger}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "44px"
  status-badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 8px"
  nav-active:
    backgroundColor: "{colors.safety-orange}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "52px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "16px"
---

# Design System: Procurement Control Center

## Overview

**Creative North Star: "ศูนย์ควบคุมเอกสาร / Document Control Center"**

Document Control Center treats every procurement request as controlled work with an accountable owner, a visible route, and an explicit next action. Its atmosphere is formal, operational, and calm under pressure: warm paper carries the dossier, graphite frames the command environment, and safety orange marks the work that needs attention now.

The visual system combines the approved A+B+C compositions: a command ledger led by the approval route, a three-part review desk with queue, dossier, and decision rail, and a process wall organized into workflow lanes. Dense information is made readable through straight grids, firm dividers, compact labels, and semantic status treatments—not through floating dashboard cards or decorative softness.

**Key Characteristics:**

- Warm paper work surfaces inside a dark graphite control shell.
- Safety orange reserved for current work, primary action, and operational emphasis.
- Square, bordered containers arranged as ledgers, dossiers, lanes, and rails.
- Dense Thai-first typography with explicit hierarchy and tabular numerals for amounts and timers.
- Status communicated by icon, label, border, and color together.

## Colors

The palette combines warm administrative paper, industrial graphite, and a disciplined safety-orange signal, supported by paired semantic inks and pale fields for workflow status.

### Primary

- **Safety Orange:** The active-work signal for primary actions, current workflow steps, selected navigation, progress fills, and high-value operational numerals.
- **Deep Safety Orange:** The hover, border, and textual emphasis companion to Safety Orange.
- **Signal Wash:** A pale orange field for selected records, active steps, and contextual notices without overwhelming document content.

### Secondary

- **Completion Green:** Confirms completed work, remaining budget, and successful actions; its pale companion carries success notices.
- **Review Blue:** Marks items waiting for document review; its pale companion keeps the badge readable at small sizes.
- **SLA Amber:** Identifies waiting and time-sensitive states; its pale companion supports advisory panels.
- **Exception Red:** Marks overdue work, required-field indicators, destructive intent, and exception copy; its pale companion is reserved for danger feedback.

### Neutral

- **Control Ink:** The default text and hazard-strip foreground.
- **Graphite Plate:** The sidebar and command-shell field.
- **Document Paper:** The primary work surface for tables, forms, dossiers, and cards.
- **Warm Desk:** The application canvas behind all operational surfaces.
- **Rule Line:** The default divider for rows, sections, and table cells.
- **Structural Rule:** The darker boundary for major regions and interactive fields.
- **White:** The high-contrast action label, input surface, and small inset plate.
- **Focus Blue:** The keyboard-only focus signal used consistently across links and controls.

### Named Rules

**The Orange Is a Command Rule.** Safety orange identifies current work or a concrete action; it is not general decoration.

**The State Has a Pair Rule.** Semantic states use a dark ink with their matching pale field, plus a border and explicit text or icon.

## Typography

**Display Font:** Sarabun, loaded globally through `next/font/google`  
**Body Font:** Sarabun, loaded globally through `next/font/google`  
**Label/Mono Font:** The same Thai-first sans-serif stack; operational numbers use tabular numerals rather than a separate mono family.

**Character:** The single-family system is plain-spoken and administrative, with bold weight doing the work of hierarchy. Negative tracking is limited to large page and record identifiers so Thai body copy remains open and legible.

### Hierarchy

- **Display:** Bold, fluid page titles with slight negative tracking; use once at the top of a surface.
- **Headline:** Bold section or form titles for primary content blocks.
- **Title:** Bold card, lane, rail, and subsection headings.
- **Body:** The default dense reading size for records, form content, navigation, and controls.
- **Label:** Compact semibold metadata, table headings, helper text, status copy, and counters.

### Named Rules

**The Plain-Spoken Type Rule.** Build hierarchy with size, weight, alignment, and spacing; do not introduce ornamental display faces into operational screens.

**The Number Is Evidence Rule.** Amounts, percentages, counts, and timers use tabular numerals and align to support comparison.

## Layout

The desktop shell reserves a fixed 252px graphite sidebar and keeps a 64px sticky utility header above a responsive main canvas. Main padding grows from 16px to 24px and then 32px at wide screens. Content is organized by borders and shared edges: tables, metric bands, step routes, process lanes, and side rails should read as one controlled work surface rather than independent floating cards.

The approved compositions are reusable layout grammars. The command ledger leads with a horizontally scrollable approval route, then a connected metric band and task table. The review desk begins as stacked regions, becomes a 260px queue plus dossier at 1280px, and becomes a 280px queue, flexible dossier, and 300px sticky decision rail at 1536px. The process wall keeps five lanes on a minimum 1050px horizontal canvas and adds a 300px summary rail at 1280px. Dense tables preserve their working width and scroll horizontally instead of collapsing columns into ambiguous cards.

At widths below 1024px, the sidebar becomes an off-canvas drawer with a backdrop and Escape dismissal. Page headers stack until the surface has enough width for aligned actions; multicolumn forms and metric bands collapse in source order. Minimum interactive heights remain 40px, with primary fields at 44px.

**The Work Has a Route Rule.** When a screen contains three or more workflow stages, show their left-to-right order or lane position explicitly; do not reduce the process to unrelated summary cards.

**The Shared-Edge Rule.** Related operational blocks meet on a common grid and share borders wherever their relationship matters.

## Elevation & Depth

The system is flat by default. Hierarchy comes from tonal layering, firm borders, sticky positioning, inset white plates, and the contrast between graphite shell and warm paper. Shadows are limited to temporary or overlay behavior: the mobile menu trigger uses a small lift, the action toast uses a larger lift, and the keyboard focus ring sits outside the control boundary.

### Shadow Vocabulary

- **Control Lift:** A small ambient shadow on the mobile menu trigger so it stays identifiable over content.
- **Toast Lift:** A stronger temporary shadow on feedback that floats above the current workspace.
- **Focus Ring:** A solid three-pixel blue ring for keyboard focus; it is an accessibility state, not decorative depth.

### Named Rules

**The Flat-by-Default Rule.** Persistent work surfaces use borders and tone, never drop shadows; elevation is reserved for temporary overlays and focus.

## Shapes

The form language is square and mechanical. Buttons, fields, cards, navigation rows, tables, workflow cells, and summary rails use hard corners and one-pixel rules. Circular geometry is reserved for tiny fastener details and timeline nodes, where it communicates a physical anchor or event point rather than softness. Dashed borders denote upload or “show more” affordances; diagonal striping denotes overdue hazard only.

**The Square Dossier Rule.** Operational containers remain square; do not round panels, buttons, fields, chips, or table regions.

**The Hazard Stripe Rule.** The 45-degree orange stripe is exclusive to overdue work and its immediate alert surface.

## Components

### Buttons

Buttons are compact, decisive controls with square edges, semibold labels, a minimum 40px height, and a one-pixel boundary.

- **Shape:** Square corners with horizontal 16px padding and an 8px icon gap.
- **Primary:** Safety Orange with white text and a Deep Safety Orange border; hover deepens the entire field.
- **Hover / Focus:** Color changes use a short standard transition. Keyboard focus applies the shared Focus Blue ring and border shift.
- **Secondary:** White with Control Ink and a Structural Rule border; hover moves to the warm neutral field.
- **Danger:** White with Exception Red; hover uses the matching pale exception field.
- **Ghost:** Transparent and borderless at rest; hover adds a subtle black wash.
- **Disabled:** Reduced opacity with a not-allowed cursor; label and silhouette remain recognizable.

### Chips

Status badges are rectangular micro-labels with an icon, a semibold compact label, a one-pixel semantic border, and a 6px internal gap. Every status selects a matching semantic ink and pale field. Filter tabs and count badges use the same square label grammar but may invert to graphite or orange when selected.

### Cards / Containers

- **Corner Style:** Square dossier panels and task cells.
- **Background:** Document Paper for major surfaces; white for inset work cards; Warm Desk remains visible between major regions.
- **Shadow Strategy:** No shadow on persistent containers.
- **Border:** Structural Rule defines major regions; Rule Line divides internal rows and cells.
- **Internal Padding:** 12px for compact lanes and list cells, 16px for standard panels, and 20–24px for dossier content.

### Inputs / Fields

- **Style:** White field, Structural Rule border, square corners, Control Ink, 12px horizontal padding, and a 44px minimum height.
- **Focus:** Shared three-pixel Focus Blue ring plus a matching border shift.
- **Error / Disabled:** Error meaning is explained in text and uses Exception Red; disabled fields keep their boundary and move to a pale neutral field.

### Navigation

The desktop navigation is a 252px graphite plate with 52px bordered rows, 16px horizontal padding, semibold labels, 20px line icons, and small fastener marks. The active row becomes Safety Orange with a darker orange border. Inactive rows use translucent white plates and brighten on hover. Below 1024px, navigation becomes an off-canvas drawer with a dark backdrop; the same row language remains intact.

### Approval Route

The approval route is a horizontal sequence of connected, minimum-height workflow cells. Each cell carries a numbered plate, stage label, workload count, and status line. The current cell uses the orange signal field and a protruding current-stage label; overdue cells alone receive hazard striping. Reveal motion runs once from left to right and is removed when reduced motion is requested.

### Review Desk

The review workspace combines a selectable queue, a full document dossier, and a sticky decision rail. Selection uses a pale orange field plus a one-pixel orange inset outline. The decision rail keeps requester, elapsed time, comment, action controls, and audit history in one vertical accountability column.

### Process Wall

The process wall uses five equal workflow lanes with shared dividers, lane counts, stacked docket cells, and a connected summary rail. Docket cells remain bordered and square; overdue cells use the hazard treatment with an inset white reading plate.

**The State Must Read Twice Rule.** A state must remain understandable through words or iconography when its color is removed.

## Do's and Don'ts

### Do:

- **Do** keep the warm-paper canvas, graphite shell, straight grid, and safety-orange command signal consistent across new surfaces.
- **Do** place the primary action at the upper right of its page or decision context when space allows.
- **Do** preserve workflow order, current ownership, due state, and next action in the first working viewport.
- **Do** use shared borders and horizontal scrolling to preserve dense tables and process lanes on small screens.
- **Do** pair status color with an explicit label, icon, and boundary.
- **Do** honor keyboard focus, reduced motion, Thai text expansion, and minimum control heights.

### Don't:

- **Don't** turn the system into a generic dashboard of rounded, floating statistic cards.
- **Don't** use safety orange as ambient decoration or apply hazard stripes to ordinary priority.
- **Don't** round operational panels, buttons, inputs, chips, or table regions.
- **Don't** hide workflow sequence, responsible role, or next action behind decorative summaries.
- **Don't** collapse dense operational tables into cards when horizontal scrolling preserves comparison better.
- **Don't** communicate status by color alone or remove the visible focus ring.
