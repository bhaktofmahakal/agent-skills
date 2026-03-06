---
name: fynt-platform-production-hardening
description: Build and upgrade production-hardening architecture for workflow automation platforms in a Fynt-inspired model using resilient auth/session handling, ownership-scoped APIs, runtime mode guards, webhook abuse controls, queue and worker safety, realtime token security, and deployment-operability patterns. Use when preparing a post-auth workflow product for production, auditing backend safety boundaries, refactoring execution reliability, or hardening existing dashboard/editor platforms beyond MVP.
---

# Fynt Platform Production Hardening

Use this skill to make workflow products safe and reliable under real-world production load.

## Invocation Contract

- `$fynt-platform-production-hardening mode=clone`
- `$fynt-platform-production-hardening mode=adapt`
- `$fynt-platform-production-hardening mode=upgrade`

If mode is missing, default to `adapt`.

## Mode Behavior

- `clone`: stay close to Fynt production DNA (runtime mode kill switch, strict ownership checks, locked run reservation, websocket token gating, redis fallback behavior).
- `adapt`: preserve reliability and security patterns while mapping to another stack, schema, and branding.
- `upgrade`: harden an existing platform with measurable risk reduction and operational improvements.

## Required Output Contract

Always include all items before finalizing:

1. Trust-boundary map (public endpoints, auth boundary, worker boundary, realtime boundary, data boundary).
2. Auth/session resilience plan (fail modes, retries, degraded behavior).
3. Ownership and tenancy enforcement plan (resource-level checks and scope rules).
4. Runtime mode and deployment topology plan (`web-only` vs `full`, production automation switches).
5. Input and webhook security plan (secret verification, rate limits, payload/header/query sanitation).
6. Execution reliability plan (plan limits, lock strategy, enqueue rollback, scheduler dedupe, worker lock lifecycle).
7. Realtime reliability and token security plan (token TTL, route auth, reconnect/degraded strategy).
8. Operability plan (health checks, logs/alerts, incident runbooks, safe fallback behavior).
9. Rubric scorecard with pass/fail.

Do not finalize without a pass from [references/quality-rubric.md](references/quality-rubric.md).

## Workflow

1. Read [references/source-pattern-map.md](references/source-pattern-map.md) first.
2. Load only needed references:
   - [references/auth-and-tenancy-guardrails.md](references/auth-and-tenancy-guardrails.md)
   - [references/security-boundaries-and-input-hardening.md](references/security-boundaries-and-input-hardening.md)
   - [references/runtime-mode-and-deployment-ops.md](references/runtime-mode-and-deployment-ops.md)
   - [references/realtime-and-execution-resilience.md](references/realtime-and-execution-resilience.md)
   - [references/improvement-playbook.md](references/improvement-playbook.md) for `upgrade`
   - [references/quality-rubric.md](references/quality-rubric.md)
3. Reuse starter scaffolds when code is requested:
   - [assets/snippets/runtime-mode-guards.ts](assets/snippets/runtime-mode-guards.ts)
   - [assets/snippets/owned-resource-procedure.ts](assets/snippets/owned-resource-procedure.ts)
   - [assets/snippets/secure-webhook-handler.ts](assets/snippets/secure-webhook-handler.ts)
   - [assets/snippets/run-reservation-transaction.ts](assets/snippets/run-reservation-transaction.ts)
   - [assets/snippets/ws-token-route.ts](assets/snippets/ws-token-route.ts)
4. Score with rubric and iterate until pass.

## Non-Negotiables

- Enforce runtime mode gates on both server and client behavior.
- Fail closed on auth and ownership checks for workflow and run resources.
- Use constant-time secret comparison for webhook/shared secret checks.
- Apply rate limits plus payload/header/query bounds on public ingress.
- Reserve run budget atomically under lock before enqueueing.
- Roll back run/usage reservations when enqueue fails.
- Verify websocket stream tokens and close stale or expired connections deterministically.
- Provide degraded behavior when Redis/realtime layers are unavailable.

## Anti-Patterns To Reject

- Trusting frontend route guards as the only authorization control.
- Webhook handlers that accept raw headers/query/body without limits or sanitation.
- Enqueue-first execution flows with no run reservation lock or usage rollback.
- Socket-only status architecture with no fallback/degradation path.
- Full production execution enabled implicitly without an explicit automation flag.
- Secrets stored or returned in plaintext.
