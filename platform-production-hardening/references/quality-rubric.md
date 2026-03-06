# Quality Rubric (Strict)

## Blocker Fail Conditions

Fail immediately if any blocker is true:

1. No ownership checks on workflow/run/resource access paths.
2. No runtime mode gating for execute/webhook/ws-token surfaces.
3. No atomic run reservation with quota/concurrency enforcement.
4. No rollback path after enqueue failure.
5. No webhook ingress controls (secret compare + rate + payload limits).
6. No realtime token verification or token expiry behavior.
7. Required output contract sections are missing.

## Weighted Categories (100 Total)

1. Auth/session resilience and tenancy boundaries: 20
2. Runtime mode and deployment safety controls: 15
3. Public ingress and secret/input hardening: 20
4. Execution reservation, queue, scheduler, lock correctness: 20
5. Realtime reliability and secure token lifecycle: 15
6. Operability, observability, and incident readiness: 10

## Scoring Guide

### 1) Auth/Tenancy (20)

- 0-8: weak or inconsistent ownership/auth boundaries.
- 9-14: baseline auth checks with notable gaps.
- 15-20: robust fail-closed auth and ownership contracts.

### 2) Runtime/Deploy (15)

- 0-6: runtime behavior ambiguous or unsafe defaults.
- 7-11: mode controls exist but incomplete wiring.
- 12-15: clear mode semantics with production-safe defaults.

### 3) Ingress Hardening (20)

- 0-8: ingress endpoints broadly exposed.
- 9-14: partial limits/validation.
- 15-20: layered secret/rate/payload/sanitization controls.

### 4) Execution Correctness (20)

- 0-8: race-prone reservation/execution path.
- 9-14: mostly reliable with rollback or dedupe gaps.
- 15-20: strong lock, reservation, dedupe, and rollback safety.

### 5) Realtime Security/Reliability (15)

- 0-6: insecure or brittle stream model.
- 7-11: auth token checks with missing lifecycle controls.
- 12-15: secure token flow and deterministic connection management.

### 6) Operability (10)

- 0-4: weak diagnostics or recovery guidance.
- 5-7: baseline monitoring/runbooks.
- 8-10: production-ready health checks, logs, alerts, and runbooks.

## Mode Thresholds

- `clone`: pass at `>= 90/100`
- `adapt`: pass at `>= 86/100`
- `upgrade`: pass at `>= 84/100` and must show measurable before/after gains

## Required Scorecard Format

- Mode:
- Blocker check:
- Auth/tenancy:
- Runtime/deploy safety:
- Ingress hardening:
- Execution correctness:
- Realtime security/reliability:
- Operability:
- Total:
- Pass/Fail:
- If fail, top 3 fixes:
