# Runtime Concurrency And Scheduling

## Run Reservation Pattern

Use per-user reservation lock around:

1. Usage record upsert/read.
2. Concurrent pending run count check.
3. Monthly quota reservation increment.
4. WorkflowRun creation.

If queue enqueue fails, roll back:

- run status to failure
- usage counter decrement

## Worker Run Lock Pattern

- Acquire lock before execution starts.
- Renew lock on interval shorter than TTL.
- Release lock only if owner token matches.
- Provide DB fallback lock when redis is unavailable.

## Scheduler Pattern

- Poll on fixed interval.
- Perform DB health check before scheduling work.
- Resolve due cron triggers.
- Use dedupe key with bucketed time window.
- Reserve usage under lock and enqueue job.
- Clear dedupe key on reservation/enqueue failure where safe.

## Runtime Modes

- `full`: queue, worker, scheduler, realtime enabled.
- `web-only`: execution, queue, and automation sources disabled.
- In production, allow explicit automation gate flags for webhook/cron sources.

## Fallback Behavior

- Redis unavailable:
  - use DB lock fallback where implemented
  - log throttled warnings to avoid alert spam
- Realtime unavailable:
  - client should poll run detail
- Scheduler DB unhealthy:
  - skip tick
  - retry on next interval
