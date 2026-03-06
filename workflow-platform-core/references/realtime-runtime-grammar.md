# Realtime And Runtime Grammar

## Runtime Topology

Model runtime as four cooperating services:

1. Web app:
- Authenticated UI, tRPC router, webhook endpoints, ws-token endpoint.

2. Queue worker:
- Consumes run jobs, executes graph, emits node/workflow events.

3. Scheduler:
- Polls cron nodes, dedupes by bucket, reserves runs, enqueues jobs.

4. Realtime relay:
- Verifies signed tokens, subscribes to redis channels, forwards run events over websocket.

## Event Model

Publish at least:

- `node` event: nodeId, status, type, optional output/error.
- `workflow` event: run-level status and timestamp.
- `socket` event: connection lifecycle hints for clients.

## Locking And Idempotency

- Use per-run execution locks in worker to avoid duplicate processing.
- Use per-user reservation locks before incrementing usage + creating run row.
- Use scheduler dedupe keys by `(workflowId, triggerNodeId, time bucket)` to avoid duplicate cron runs.

## Client Stream Reliability

- Prime socket auth token from execute mutation response when available.
- Maintain reconnect with exponential backoff and jitter.
- Rotate websocket URL candidates when host variants fail.
- On disconnect during active run, switch to polling fallback.
- Reconcile terminal node statuses from persisted run detail.

## Connection Lifecycle Policy

- Ping/pong heartbeat.
- Idle timeout close.
- Token expiry close with explicit status.
- Auto-close shortly after terminal workflow status.

## Failure Policies

- Queue enqueue failure:
  - mark run failed
  - decrement usage reservation
  - return retryable server error

- Realtime subscription failure:
  - emit socket error status
  - close cleanly
  - keep polling path available in UI

- DB health degradation in scheduler:
  - skip tick safely
  - retry with backoff
  - avoid creating partial run records
