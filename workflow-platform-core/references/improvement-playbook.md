# Improvement Playbook

Use this for `mode=upgrade`.

## Upgrade Sequence

1. Baseline audit
- Inventory existing auth shell, page IA, editor behavior, execution APIs, and realtime path.
- Capture current gaps against [quality-rubric.md](quality-rubric.md).

2. Stabilize product shell
- Introduce route-aware dashboard layout.
- Normalize sidebar IA, page headers, and state handling patterns.
- Add consistent loading/empty/error states.

3. Harden editor reliability
- Add graph normalization and validation.
- Add autosave queueing, save status indicators, undo/redo safety.
- Gate execute actions by trigger semantics and validation state.

4. Harden backend contract
- Add zod schemas and payload caps.
- Add ownership checks and template graph integrity checks.
- Add plan + concurrency reservation with rollback on enqueue failure.

5. Harden runtime path
- Add signed websocket bootstrap tokens.
- Ensure queue-worker events are emitted per node and workflow.
- Add client reconnect plus polling fallback.

6. Verify and score
- Run rubric scoring and list remaining high-impact failures.
- Ship only after threshold pass.

## Before/After Metrics To Report

- List page latency and interaction smoothness.
- Editor save reliability under rapid edits.
- Execution failure rate due to contract mismatch.
- Time-to-first-status in run panel.
- Recovery behavior under socket disconnect.
- Accessibility deltas (focus, contrast, reduced-motion).

## Refactor Priorities

- First fix: correctness of execute contracts and reservation logic.
- Second fix: editor data-loss and invalid graph persistence risks.
- Third fix: realtime observability reliability.
- Last fix: purely cosmetic polish.
