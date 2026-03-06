# Improvement Playbook (`upgrade` mode)

Use this when refactoring an existing platform. Prioritize risk reduction before visual or feature expansion.

## Phase Order

1. Auth and ownership boundaries
2. Runtime gating and deployment safety switches
3. Public ingress hardening (webhooks/APIs)
4. Execution reservation, lock, and rollback reliability
5. Realtime lifecycle and fallback behavior
6. Operability (health checks, alerts, runbooks)

## 1) Baseline Assessment

Capture current state first:

- auth outage behavior
- ownership enforcement coverage
- webhook abuse controls (rate/body/secret/sanitize)
- execution correctness under concurrency
- realtime failure handling
- incident visibility (logs/metrics)

## 2) Apply Hardening Increments

For each phase:

1. Implement smallest safe change.
2. Add or update tests for that failure mode.
3. Add logs/metrics for the new boundary.
4. Roll out behind feature flag if risk is high.

## 3) Measure Before/After

Report measurable improvements:

- unauthorized access vectors reduced
- duplicate/over-limit run incidents reduced
- enqueue rollback correctness rate
- websocket auth reject correctness
- mean time to detect/triage incidents

## 4) Upgrade Output Format

Provide:

1. Before snapshot (top risks).
2. Change plan by phase.
3. Exact contracts introduced (guards, limits, locks, fallbacks).
4. Test matrix and results.
5. After snapshot with quantified improvements.

## 5) Common Upgrade Mistakes

- Hardening only frontend UX without server-side enforcement.
- Adding runtime flags without wiring every execution ingress path.
- Implementing lock/quotas in app memory instead of shared backing store.
- Shipping realtime without expiry/idle/heartbeat close policies.
- No rollback path when queue enqueue fails after reservation.
