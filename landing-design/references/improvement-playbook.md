# Improvement Playbook

## Scope

Use this document in `upgrade` mode to transform existing landing page/frontend code to the Fynt quality bar.

## 1) Intake Checklist

Capture current state before editing:

1. Current section order.
2. Existing token system (color/type/spacing).
3. Motion implementation style.
4. Presence/absence of SVG structural language.
5. Responsive behavior by breakpoint.
6. Accessibility baseline (contrast/focus/reduced-motion).

## 2) Upgrade Pipeline

### Step A: Structural Refactor

- Normalize section sequence to a narrative flow.
- Introduce separator punctuation at major transitions.
- Enforce a stable container rhythm.

### Step B: Hierarchy Refactor

- Clarify heading/subheading tiers.
- Reduce copy density in hero and feature cards.
- Introduce display moments where needed.

### Step C: SVG Refactor

- Replace generic illustration with structured SVG system.
- Add separator motifs and node terminals.
- Ensure depth layering and readable edge contrast.

### Step D: Motion Refactor

- Standardize timings/easing.
- Remove noisy or redundant transitions.
- Add reduced-motion behavior in both JS and CSS.

### Step E: Responsive and A11y Pass

- Verify mobile stack order.
- Validate CTA readability and touch targets.
- Ensure contrast and visible focus states.

## 3) Upgrade Deliverable Format

Always return:

1. `Before` diagnosis (short, concrete, measurable).
2. `Refactor plan` grouped by section.
3. `After` architecture and style summary.
4. `Code-level changes` (component-by-component).
5. `Measured improvement table`.
6. `Rubric scorecard` from quality rubric.

## 4) Measurable Improvement Metrics

Track at least 5:

- Number of consistent spacing tokens used.
- Number of motion timing variants reduced.
- Number of sections with explicit separators.
- Presence of reduced-motion fallback (`yes/no`).
- Contrast check pass rate for text and controls.
- Mobile overflow issues before/after.

## 5) Recommended Refactor Targets

- Move one-off inline styles to reusable tokens/components.
- Split giant sections into purposeful subcomponents.
- Extract separator and SVG motifs into reusable files.
- Replace hard-coded animation values with named motion tokens.

## 6) Upgrade Priorities (When Time Is Limited)

Apply in this order:

1. Information architecture and hierarchy.
2. Responsive integrity.
3. Accessibility and reduced-motion safety.
4. SVG language upgrade.
5. Motion polish.

## 7) Risk Controls

- Keep existing functional behavior intact while improving presentation.
- Avoid introducing heavy runtime cost in hero graphics.
- Avoid style drift across sections by enforcing shared tokens.

## 8) Hard Anti-Patterns

Reject upgrade output if it:

- Focuses only on color tweaks with no structural improvements.
- Adds animation without reduced-motion support.
- Keeps boilerplate hero patterns with no SVG composition upgrade.
- Ignores mobile layout and focus accessibility.
