# Quality Rubric (Strict)

## Blocker Fail Conditions

Fail immediately if any blocker is true:

1. No typed schema/parser boundary for node/edge payloads.
2. No execution lock or no reservation lock around usage/concurrency checks.
3. No rollback on enqueue failure after usage reservation.
4. No outbound URL safety checks for integration executors.
5. No deterministic node/workflow status model.
6. No required output contract sections in final response.

## Weighted Categories (100 Total)

1. Contract and schema rigor: 20
2. Execution loop correctness: 20
3. Node executor safety and reliability: 20
4. Concurrency, scheduling, and idempotency: 15
5. Realtime observability and fallback behavior: 10
6. Upgrade practicality and migration safety: 10
7. Operational clarity and test strategy: 5

## Scoring Guide

### 1) Contract Rigor (20)

- 0-8: weak typing/validation or implicit contracts.
- 9-14: mostly typed with notable gaps.
- 15-20: strong schema, parse, and contract boundaries.

### 2) Execution Correctness (20)

- 0-8: brittle run semantics or unresolved graph edge cases.
- 9-14: acceptable but misses conditional/skip nuance.
- 15-20: deterministic graph-state execution with robust edge handling.

### 3) Executor Safety (20)

- 0-8: insecure outbound calls or poor provider error clarity.
- 9-14: mostly safe with missing limits/hints.
- 15-20: secure adapters with clear failure semantics and payload controls.

### 4) Concurrency/Scheduling (15)

- 0-6: race-prone reservation/scheduling behavior.
- 7-11: partial protection.
- 12-15: lock-safe, deduped, rollback-aware scheduling.

### 5) Realtime (10)

- 0-4: weak event model or no fallback strategy.
- 5-7: basic stream behavior.
- 8-10: resilient stream + polling fallback and clear status events.

### 6) Upgrade Safety (10)

- 0-4: risky migration path.
- 5-7: moderate migration strategy.
- 8-10: practical, phased, measurable improvements.

### 7) Ops/Test (5)

- 0-2: weak verification strategy.
- 3-4: good but incomplete.
- 5: concise, high-confidence test and ops plan.

## Mode Thresholds

- `clone`: pass at `>= 88/100`
- `adapt`: pass at `>= 85/100`
- `upgrade`: pass at `>= 82/100` and include measurable before/after improvements

## Required Scorecard Format

- Mode:
- Blocker check:
- Contract rigor:
- Execution correctness:
- Executor safety:
- Concurrency/scheduling:
- Realtime:
- Upgrade safety:
- Ops/test:
- Total:
- Pass/Fail:
- If fail, top 3 fixes:
