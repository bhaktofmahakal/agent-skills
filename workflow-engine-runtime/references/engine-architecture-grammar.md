# Engine Architecture Grammar

## Runtime Topology

Use this default chain:

1. Control plane:
- API validates request intent and ownership.
- Usage/concurrency reservation performed under lock.
- Run record created and queued.

2. Data plane:
- Worker consumes queue job.
- Worker locks run and fetches graph + prior node runs.
- Engine executes graph with deterministic state updates.
- Node and workflow events published to stream channel.

3. Observability plane:
- Run detail persisted to DB.
- Realtime service relays events to clients.
- Clients fall back to polling if stream degrades.

## Engine Loop Rules

- Parse node/edge payloads using strict parser functions.
- Detect cycles before execution.
- Resolve entry nodes from run source semantics:
  - manual trigger
  - webhook trigger
  - cron trigger
  - single-node target run
- Execute reachable graph only.
- Mark inactive/unreachable branches as skipped or bypassed with explicit reason.
- Determine terminal state from completed/skipped/failed counts.

## Status Model

Keep status vocabulary explicit and consistent:

- Node level:
  - `Pending`
  - `Running`
  - `Success`
  - `Failed`
  - `Skipped`

- Workflow run level:
  - `Pending`
  - `Success`
  - `Failure`

## Output Propagation Rules

- Build run metadata map from successful upstream node outputs.
- Include named aliases (for responseName-like behavior) when unambiguous.
- Limit large output payloads before stream emission.
- Preserve full output in persistence layer when safe.

## Error Handling Rules

- Throw fast on structural errors.
- Return provider-specific hints on external API failures.
- Track retry count per node run.
- Mark run failure with enriched error metadata when unrecoverable.

## Idempotency Rules

- Use one lock per workflow run in worker.
- Renew lock heartbeat while run is active.
- Release lock only when owner matches.
- Ensure scheduler dedupe for periodic triggers.
