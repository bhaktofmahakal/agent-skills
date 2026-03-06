# Improvement Playbook

Use this in `mode=upgrade`.

## Upgrade Order

1. Contract hardening
- Add strict parser/schema boundaries.
- Add clear execution-mode semantics.
- Add missing ownership and trigger-context guards.

2. Runtime correctness
- Add run reservation lock and rollback paths.
- Add per-run worker locking and lock heartbeat.
- Add deterministic terminal status logic.

3. Executor safety
- Add SSRF guard and timeout behavior.
- Add provider-specific error hints.
- Add payload truncation and strict JSON checks.

4. Scheduling and dedupe
- Add bucket dedupe keys.
- Add DB health check and retry policy.
- Add safe failure handling around enqueue errors.

5. Observability
- Emit structured node/workflow events.
- Add reconnect/poll fallback on client.
- Add run diagnostics in error metadata.

## Before/After Metrics

- Duplicate run incidence.
- Queue enqueue rollback success rate.
- Mean time to first node status in UI.
- Node execution failure clarity score.
- Undefined-template-variable runtime failures.
- Cron drift and duplicate schedule count.

## Regression Traps

- Breaking legacy workflows when enabling strict mode globally.
- Treating all node `success=false` outputs identically.
- Ignoring race windows around reservation and enqueue.
- Losing run-level observability after refactor.
