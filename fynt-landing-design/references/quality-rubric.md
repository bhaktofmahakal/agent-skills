# Quality Rubric (Strict)

## Usage

Score every output before finalizing. Use integer scores.

## Blocker Fail Conditions (Automatic Fail)

Fail immediately if any blocker is true:

1. No reduced-motion path.
2. Contrast failures on core text or primary actions.
3. Missing responsive behavior for mobile and desktop.
4. SVG language absent or replaced with generic placeholder art.
5. Output omits required contract sections (architecture, motion plan, SVG plan, responsive, a11y/perf checks).

## Weighted Categories (100 Total)

1. Section architecture and narrative flow: 20
2. Visual hierarchy and typography clarity: 15
3. SVG language quality and depth layering: 20
4. Motion quality and restraint: 15
5. Responsive behavior and breakpoint integrity: 15
6. Accessibility and performance safeguards: 10
7. Cross-section polish and consistency: 5

## Scoring Guide

### 1) Section Architecture (20)

- 0-8: Generic sections, weak flow, no punctuation.
- 9-14: Reasonable flow, some structure gaps.
- 15-20: Cohesive narrative, separators, balanced pacing.

### 2) Hierarchy and Typography (15)

- 0-6: Flat hierarchy, noisy text density.
- 7-11: Mostly clear with minor imbalance.
- 12-15: Strong headline/body/control hierarchy with readable rhythm.

### 3) SVG Language (20)

- 0-8: Minimal or generic SVG.
- 9-14: Some structural motifs, limited depth.
- 15-20: Distinct geometric system, layered depth, separator coherence.

### 4) Motion (15)

- 0-6: Inconsistent timings or excessive animation.
- 7-11: Mostly coherent with minor rough edges.
- 12-15: Purposeful, restrained, readable transitions with strong defaults.

### 5) Responsive (15)

- 0-6: Breakpoint issues, overflow, weak mobile behavior.
- 7-11: Works across breakpoints with minor issues.
- 12-15: Intentional desktop/tablet/mobile adaptation.

### 6) A11y + Performance (10)

- 0-4: Missing focus states or reduced-motion/perf guardrails.
- 5-7: Most checks present.
- 8-10: Robust contrast, focus, reduced-motion, and animation performance discipline.

### 7) Polish Consistency (5)

- 0-2: Style drift and token inconsistency.
- 3-4: Mostly consistent.
- 5: Highly consistent finish.

## Mode Thresholds

- `clone`: pass at `>= 88/100`.
- `adapt`: pass at `>= 85/100`.
- `upgrade`: pass at `>= 82/100` and show measurable before/after improvements.

## Required Scorecard Format

Return scorecard exactly in this structure:

- Mode:
- Blocker check:
- Section architecture:
- Hierarchy/type:
- SVG language:
- Motion:
- Responsive:
- A11y/perf:
- Polish:
- Total:
- Pass/Fail:
- If fail, top 3 fixes:
