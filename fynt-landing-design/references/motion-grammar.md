# Motion Grammar

## Scope

Use this document for interaction timing, entrance sequencing, and reduced-motion behavior.

## Source Anchors

- `apps/web/components/landing-page/hero/HeroAnimation.tsx`
- `apps/web/components/landing-page/header/Header.tsx`
- `apps/web/components/landing-page/bento-grid/F2WorkflowRunning.tsx`
- `apps/web/components/landing-page/templates/TemplatesSection.tsx`
- `apps/web/app/globals.css`

## 1) Motion Philosophy

- Keep motion meaningful and sparse.
- Prioritize comprehension and hierarchy over spectacle.
- Use short, readable transitions for hover/tap.
- Reserve longer sequences for hero reveal or card stack context.

## 2) Timing Baselines

Use these ranges unless a section has explicit reason to differ:

- Hover/tap: `0.10s` to `0.20s`.
- Small reveal: `0.20s` to `0.35s`.
- Hero structural reveal: around `0.85s` with staged delays.
- Card/tabs spring: medium stiffness, high damping to avoid bounce noise.

Source-derived presets:

- Hero reveal: duration `0.85`, delay `0.6`, easing `[0.23, 1, 0.32, 1]`.
- Tab spring: stiffness `~380`, damping `~28`.
- Card spring: stiffness `~600`, damping `~28`.
- Button label flip: about `0.13s` enter/exit windows.

## 3) Easing Language

Preferred curves:

- Strong ease-out for entrance: `[0.23, 1, 0.32, 1]` or `[0.25, 0.46, 0.45, 0.94]`.
- Fast hover easing for controls: `[0.25, 0.1, 0.25, 1.0]`.
- Exit easing should be faster than enter easing for responsiveness.

Avoid:

- Long elastic/bouncy curves on core layout.
- Multiple conflicting easing systems in same section.

## 4) Pattern Library

### A) Entrance Reveal

- Start from slight `y` offset (`6-10px`) and low opacity.
- Animate once on viewport entry (`once: true`).
- Stagger section header pieces by `0.05-0.12s`.

### B) Hover Elevation

- Raise by `1-3px` and optional subtle scale (`1.005-1.01`).
- Apply only to interactives, not full large containers.

### C) Stateful Switch (tabs/cards)

- Keep active state transitions short and crisp.
- For stacked cards, combine position ordering + controlled opacity to maintain depth logic.

### D) Looping Motion

- Only on small accent elements (spinner, floating block, micro pointer).
- Stop or neutralize loop under reduced-motion preference.

## 5) Reduced-Motion Policy (Required)

Always implement both:

1. JS-level reduction using `useReducedMotion()` in Framer Motion.
2. CSS-level reduction via `@media (prefers-reduced-motion: reduce)` fallback.

Behavior when reduced motion is enabled:

- Replace animated transitions with immediate state changes (`duration: 0` or near-zero).
- Disable infinite loops and decorative float cycles.
- Preserve layout and information order.

## 6) Performance Guardrails

- Avoid animating expensive filters on large layers continuously.
- Prefer transform and opacity over layout-affecting properties.
- Keep simultaneous animated elements bounded.
- Deactivate idle animations offscreen or on small devices when possible.

## 7) Mode Rules

`clone`:

- Keep source-like timing signatures and easing profile.
- Keep restrained animation density.

`adapt`:

- Maintain interaction quality and pacing, allow brand-specific motion accent.
- Do not exceed source complexity by default.

`upgrade`:

- Prioritize motion cleanup: remove noisy transitions, unify timing tokens, add missing reduced-motion.
- Quantify before/after (e.g., number of mismatched durations reduced from X to Y).

## 8) Hard Anti-Patterns

Reject output if it contains:

- No reduced-motion fallback.
- Continuous motion on large background layers without user value.
- Mixed unrelated durations/easings across neighboring controls.
- Delays that block interaction readiness.
