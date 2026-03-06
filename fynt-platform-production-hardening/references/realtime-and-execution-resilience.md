# Realtime And Execution Resilience

## 1. Run Reservation Before Enqueue

Reserve capacity before enqueueing:

1. Acquire per-user lock.
2. Start transaction.
3. Upsert monthly usage bucket.
4. Check pending concurrency count.
5. Reserve monthly quota atomically.
6. Create run record with source metadata.
7. Commit and enqueue job.
8. If enqueue fails, mark run failure and decrement usage reservation.

This prevents overbooking and usage drift under concurrent requests.

## 2. Locking Strategy

Use lock layers for different risk domains:

- Reservation lock (user-level) around plan/concurrency reservation.
- Execution lock (run-level) inside worker to avoid double processing.
- Lock heartbeat renewal for long-running jobs.
- Safe unlock with token/owner check.

## 3. Scheduler Reliability

- Poll on predictable interval (for example 60s).
- Run DB health checks with timeout + retries before each tick.
- Deduplicate schedules by workflow/node/time bucket via Redis `NX` keys.
- Reserve runs with same policy as manual/webhook paths.
- Roll back reservation if enqueue fails.

## 4. Websocket Token Security

- Issue short-lived stream tokens (for example 5 minutes).
- Include both `runId` and `userId` in token payload.
- Verify run ownership before issuing token.
- Support dedicated stream signing secret with fallback secret policy.

## 5. Realtime Connection Lifecycle

- Verify token on upgrade.
- Subscribe to run-scoped pub/sub channel.
- Enforce ping/pong heartbeat.
- Enforce idle timeout.
- Enforce token-expiry timeout.
- Auto-close after terminal workflow status message.

## 6. Degraded Behavior

When realtime or Redis is degraded:

- Keep execution core path functional where possible.
- Surface clear status mode (`socket`, `polling`, `idle`, `degraded`).
- Fall back to polling for run detail updates.
- Throttle warning logs to avoid alert floods.

## 7. Observability Requirements

Capture and expose:

- enqueue success/failure counts
- lock timeout counts
- run reservation rejections by cause (monthly/concurrency)
- scheduler dedupe collisions
- websocket upgrade rejects by reason
- realtime disconnect reasons (idle/token/heartbeat/error)

## 8. Validation Checklist

- Concurrent execute requests do not exceed quota.
- Enqueue failure does not leak reserved usage count.
- Duplicate cron ticks do not create duplicate runs.
- Double worker pickup does not execute same run twice.
- Expired/invalid stream tokens are rejected.
- Realtime disconnect still leaves a usable run status path.
