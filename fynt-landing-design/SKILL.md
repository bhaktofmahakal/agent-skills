---
name: fynt-landing-design
description: Build and upgrade high-polish landing and marketing frontends in a Fynt-inspired system using Next.js, Tailwind CSS, Framer Motion, and custom SVG composition. Use when creating new landing pages, redesigning marketing pages, improving existing frontend TSX, or requesting SVG-heavy hero sections with restrained motion and responsive dark-theme visual hierarchy.
---

# Fynt Landing Design

Use this skill to generate or improve landing/marketing frontends in one of three modes.

## Invocation Contract

- `$fynt-landing-design mode=clone`
- `$fynt-landing-design mode=adapt`
- `$fynt-landing-design mode=upgrade`

If mode is missing, default to `adapt`.

## Mode Behavior

- `clone`: stay closest to Fynt visual DNA (editorial lines, node separators, dark canvas, orange accent hierarchy, isometric SVG language).
- `adapt`: preserve structure, craft, and motion quality while retheming for another brand.
- `upgrade`: transform an existing page or TSX into this quality bar with explicit before/after changes.

## Required Output Contract

Always include all of the following before finalizing:

1. Section architecture plan.
2. Motion plan (entry, hover, transition, reduced-motion path).
3. SVG treatment plan (hero composition + separators + bento/card motifs).
4. Responsive behavior plan (mobile, tablet, desktop).
5. Accessibility and performance checks.
6. Rubric scorecard with pass/fail decision.

Do not finalize without a rubric pass from [references/quality-rubric.md](references/quality-rubric.md).

## Workflow

1. Identify mode and constraints.
2. Read [references/source-pattern-map.md](references/source-pattern-map.md) first to anchor output in concrete source patterns.
3. Load only needed references:
   - [references/design-grammar.md](references/design-grammar.md)
   - [references/motion-grammar.md](references/motion-grammar.md)
   - [references/svg-grammar.md](references/svg-grammar.md)
   - [references/improvement-playbook.md](references/improvement-playbook.md) (required in `upgrade` mode)
   - [references/quality-rubric.md](references/quality-rubric.md)
4. Build output using assets as scaffolds when code is requested:
   - [assets/snippets/landing-skeleton.tsx](assets/snippets/landing-skeleton.tsx)
   - [assets/snippets/section-shell.tsx](assets/snippets/section-shell.tsx)
   - [assets/svg/HeroIsoBlocks.tsx](assets/svg/HeroIsoBlocks.tsx)
   - [assets/svg/SectionSeparatorSystem.tsx](assets/svg/SectionSeparatorSystem.tsx)
   - [assets/svg/BentoTilePrimitives.tsx](assets/svg/BentoTilePrimitives.tsx)
5. Run a strict rubric check and return scores.

## Non-Negotiables

- Keep motion restrained and purposeful; avoid animation spam.
- Preserve reduced-motion behavior using both `useReducedMotion()` and CSS/media fallback.
- Use handcrafted or structured SVG systems, not random icon collages.
- Keep contrast and focus states accessible.
- Keep visual effects performance-safe (avoid heavy filters over large constantly-animating surfaces).

## Anti-Patterns To Reject

- Flat SaaS boilerplate without section rhythm or separators.
- Generic gradient hero with stock blob art replacing structural SVG composition.
- Overlong animations, unbounded spring chains, or jittery hover effects.
- No mobile strategy or no reduced-motion fallback.
- Color/token inconsistency across cards, controls, and separators.

## Framework Baseline

Default target stack is Next.js + Tailwind CSS + Framer Motion.
