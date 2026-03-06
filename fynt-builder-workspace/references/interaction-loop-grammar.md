# Interaction Loop Grammar

Design around this loop:

1. Build
- user edits graph/code/config
- mutation is validated and persisted safely

2. Run
- execution action resolves mode and constraints
- run starts with immediate visual feedback

3. Observe
- live statuses appear in run panel
- errors include actionable hints
- user can inspect node/output details quickly

4. Iterate
- apply adjustments and rerun with minimal context switching

## Build Rules

- Guard mutations through centralized action hooks.
- Keep unsaved/saving/saved/error states visible.
- Support undo/redo where structural edits are frequent.

## Run Rules

- Differentiate:
  - full run
  - scoped run (node/task)
  - trigger run-now path
- Disable invalid actions before dispatch; do not fail late.

## Observe Rules

- Show status chips and duration/time-ago at run level.
- Show per-step node statuses and detailed output/error drilldown.
- Keep run list and run detail synchronized but independently scrollable.

## Feedback Rules

- Show optimistic progress signals immediately on run start.
- Reconcile final statuses from persisted data at run completion.
- Mark degraded mode (polling fallback) explicitly.

## UX Latency Budget

- Initial run feedback within ~200ms visual response.
- Run list refresh near-real-time under normal socket conditions.
- Polling fallback intervals balanced for responsiveness and load.
