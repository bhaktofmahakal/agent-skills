# Quality Rubric (Strict)

## Blocker Fail Conditions

Fail immediately if any blocker is true:

1. No explicit build/run/observe loop.
2. No run telemetry/detail pane or equivalent observability surface.
3. No degraded-mode behavior for realtime disconnections.
4. No keyboard or command-surface plan for core actions.
5. No loading/empty/error states for major panes.
6. Required output contract sections are missing.

## Weighted Categories (100 Total)

1. Workspace IA and pane composition: 20
2. Interaction-loop clarity and speed: 20
3. Realtime feedback resilience: 20
4. State handling and failure boundaries: 15
5. Command/shortcut ergonomics: 10
6. Responsive and accessibility quality: 10
7. Visual consistency and polish: 5

## Scoring Guide

### 1) IA/Panes (20)

- 0-8: generic dashboard, weak workspace semantics.
- 9-14: workable structure with notable gaps.
- 15-20: strong builder layout and pane role clarity.

### 2) Loop Quality (20)

- 0-8: fragmented build/run/observe flow.
- 9-14: mostly coherent with friction.
- 15-20: tight loop with minimal context switching.

### 3) Realtime Resilience (20)

- 0-8: brittle transport assumptions.
- 9-14: partial reconnect/fallback logic.
- 15-20: robust stream + fallback with clear UX signals.

### 4) State/Failures (15)

- 0-6: missing critical states.
- 7-11: basic states, weak degradation handling.
- 12-15: complete state model with safe boundaries.

### 5) Commands (10)

- 0-4: mouse-only flow.
- 5-7: partial keyboard support.
- 8-10: clear, consistent command ergonomics.

### 6) Responsive/A11y (10)

- 0-4: weak viewport behavior or poor focus/contrast.
- 5-7: mostly usable.
- 8-10: responsive and accessible across core interactions.

### 7) Polish (5)

- 0-2: inconsistent finishing.
- 3-4: mostly consistent.
- 5: high coherence and finishing quality.

## Mode Thresholds

- `clone`: pass at `>= 88/100`
- `adapt`: pass at `>= 85/100`
- `upgrade`: pass at `>= 82/100` and show measurable improvements

## Required Scorecard Format

- Mode:
- Blocker check:
- IA/panes:
- Interaction loop:
- Realtime resilience:
- State/failure handling:
- Commands:
- Responsive/a11y:
- Polish:
- Total:
- Pass/Fail:
- If fail, top 3 fixes:
