# Quality Rubric (Strict)

## Blocker Fail Conditions

Fail immediately if any blocker is true:

1. Missing runtime-mode guard for execution paths.
2. Missing ownership checks on workflow or run detail APIs.
3. Missing reduced-motion path on authenticated product surfaces.
4. Missing graph validation or template graph integrity checks.
5. Missing plan/concurrency protection before enqueue.
6. Missing fallback path when websocket live updates are unavailable.
7. Missing required output contract sections.

## Weighted Categories (100 Total)

1. Product IA and dashboard UX clarity: 15
2. Workflow editor interaction and state safety: 15
3. API contract quality and validation rigor: 20
4. Execution lifecycle reliability (queue-worker-realtime): 20
5. Security and abuse protections: 10
6. Responsive behavior, motion discipline, accessibility: 10
7. Operability and performance safeguards: 10

## Scoring Guide

### 1) Product IA (15)

- 0-6: scattered pages, weak hierarchy, missing core states.
- 7-11: mostly coherent, uneven state handling.
- 12-15: clear flow, strong task separation, robust states.

### 2) Editor Safety (15)

- 0-6: fragile editing, no robust save/history model.
- 7-11: usable with notable reliability gaps.
- 12-15: stable autosave/history/validation execution UX.

### 3) API Contracts (20)

- 0-8: weak validation, ambiguous execute semantics.
- 9-14: mostly solid contracts with gaps.
- 15-20: tight schemas, ownership checks, explicit execution modes.

### 4) Execution Reliability (20)

- 0-8: brittle queue/realtime path.
- 9-14: functional but weak fallback/recovery.
- 15-20: resilient run reservation, enqueue rollback, socket+poll reliability.

### 5) Security (10)

- 0-4: weak secret handling or webhook protection.
- 5-7: baseline protections present.
- 8-10: strong secret, rate-limit, validation, and abuse controls.

### 6) Responsive/Motion/A11y (10)

- 0-4: poor responsiveness or inaccessible interactions.
- 5-7: generally usable with gaps.
- 8-10: responsive, reduced-motion aware, accessible states.

### 7) Operability/Performance (10)

- 0-4: no practical failure handling or expensive UX defaults.
- 5-7: moderate operational readiness.
- 8-10: strong retries, health checks, and efficient interaction patterns.

## Mode Thresholds

- `clone`: pass at `>= 88/100`
- `adapt`: pass at `>= 85/100`
- `upgrade`: pass at `>= 82/100` and must include measurable before/after improvements

## Required Scorecard Format

- Mode:
- Blocker check:
- Product IA:
- Editor safety:
- API contracts:
- Execution reliability:
- Security:
- Responsive/motion/a11y:
- Operability/performance:
- Total:
- Pass/Fail:
- If fail, top 3 fixes:
