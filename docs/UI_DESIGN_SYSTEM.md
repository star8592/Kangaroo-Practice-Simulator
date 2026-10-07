# Socthink UI Design System

This file is the implementation contract for the public website, student surfaces, parent center and admin tools.

## Layout tiers

Use only these page-width tiers for route-level containers:

- **Standard — 1200px**: home, competitions, review, student, parent and ordinary admin pages.
- **Wide — 1440px**: exam/workbench surfaces that need persistent side navigation or dense data.
- **Focus — 960px**: focused workflows such as calendars and training sessions.
- **Auth — 1040px**: split authentication experiences.
- **Reading — 820px**: policies and long-form reading.

Route containers must use the CSS variables in `globals.css`; do not introduce another literal route max-width.

## Page gutters and vertical rhythm

- Desktop gutter: 28px
- Tablet gutter: 20px
- Mobile gutter: 14px
- Standard page top: 48px
- Tablet page top: 36px
- Compact/mobile page top: 28px
- Standard page bottom: 88px

Component-internal spacing uses the shared 4/8/12/16/20/24/32/40/48/64 scale.

## Surface hierarchy

- Controls: 11px radius.
- Cards: 18px radius.
- Major panels: 22px radius.
- Hero surfaces: 28px radius.
- Ordinary cards use the shared light border and soft shadow.
- Ordinary fields use the shared field border, control height and focus ring; local pages must not invent a second focus language.
- Subtle informational surfaces use `--surface-subtle` rather than page-specific near-white colors.
- Large shadows are reserved for hero, modal and floating account surfaces.

## Typography hierarchy

- Route/page title: `--title-page` (36px desktop, 30px mobile).
- Section title: `--title-section`.
- Hero title: `--title-hero`.
- Eyebrows are short context labels, not substitute headings.
- Body copy should normally remain 12–16px with 1.55–1.8 line height.

## Responsive contract

- Desktop: full content width and desktop navigation.
- <=1080px: navigation collapses; complex grids may reduce columns.
- <=760px: tablet gutters, 32px page titles and stacked page headers.
- <=600px: 14px mobile gutter, 30px page titles, 28px compact page top and single-column priority flow.

Avoid horizontal page scrolling. Dense tables may use an explicit internal horizontal scroller.

## Component rules

Use the shared global button classes for primary, secondary and ghost actions. Forms should use one visual language for label, control height, focus state and validation. Do not create a new page-specific button or card treatment unless the interaction meaning is genuinely different.

Ordinary product surfaces — candidate cards, analysis panels, empty states, parent diagnosis panels, competition introductions, training launchpads, exam companions, loading/center cards and result stat cards — share the standard surface border, radius token and soft shadow. Specialized visual systems such as achievement cards, mathematical diagrams and animated solution players may intentionally diverge when the difference carries product meaning.

## Governance

`scripts/audit_design_system.py` is part of the public quality gate. Any new route-level shell must map to a defined layout tier instead of adding a new arbitrary width.
