# State And Resilience Grammar

## Required UI States Per Pane

Each major pane should define:

- `loading`
- `empty`
- `active`
- `error`
- `degraded` (partial data or fallback mode)

## Failure Boundaries

- Build pane failures should not crash observe pane.
- Realtime failures should not block run history exploration.
- Data fetch failures should preserve last known good snapshot where safe.

## Persistence Resilience

- Keep local snapshots for fast workspace restoration where appropriate.
- Invalidate stale cache on schema mismatch.
- Support optimistic operations with rollback context.

## Command Safety

- Ignore global shortcuts when typing in input/textarea/contentEditable.
- Keep destructive actions confirmation-gated.
- Lock interaction modes when background operations require it.

## Performance Rules

- Cap animation scope inside dense panes.
- Avoid full-tree re-renders on high-frequency status events.
- Window or paginate long run histories.
- Truncate large output previews with explicit expansion control.
