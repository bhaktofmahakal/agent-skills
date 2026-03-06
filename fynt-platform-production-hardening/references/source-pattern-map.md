# Source Pattern Map

Use this map first. It links concrete repository patterns to reusable production hardening rules.

## Auth And Session Resilience

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/lib/auth.ts` | Hard requirement on `BETTER_AUTH_SECRET`, secure cookies in production, trusted origins, rate limits with Redis-backed secondary storage fallback to memory. | Treat auth as an infrastructure dependency with explicit secret requirements, strict cookie policy, and resilient rate-limit storage. |
| `apps/web/lib/auth-session.ts` | Session retrieval retries only transient/internal failures with bounded exponential backoff. | Add bounded retry around auth session reads; fail fast on non-transient errors. |
| `apps/web/server/trpc.ts` | Context marks `authUnavailable` and protected procedures distinguish unauthorized vs auth system outage. | Return explicit degraded auth errors instead of generic crashes; preserve stable API semantics. |
| `apps/web/proxy.ts` | Security headers on every response and redirect-to-signin for protected routes. | Enforce baseline security headers and route-level auth redirection at edge/middleware boundary. |

## Ownership And Tenancy Boundaries

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/server/routers/workflow.ts` | Execute mutation scopes workflow fetch by `userId`, validates trigger-node ownership, and rejects cross-context execution params. | Scope every mutable resource operation to the authenticated owner and reject ambiguous execution intent. |
| `apps/web/server/routers/execution.ts` | Run detail checks `run.workflow.userId === ctx.userId` before returning execution payloads. | Never expose run telemetry without an explicit ownership assertion. |
| `apps/web/app/api/executions/[runId]/ws-token/route.ts` | WS token route checks session + run ownership before issuing token. | Gate every realtime token by both auth and resource ownership. |

## Runtime Mode And Deployment Guards

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/runtime/automationFlags.ts` | Runtime mode defaults to `web-only` in production unless explicitly configured; automation in production requires explicit opt-in flag. | Design execution as opt-in in production; keep a global kill switch for automation surfaces. |
| `apps/web/lib/runtime-mode.ts` | Client runtime mode gates execute UX for `web-only`. | Mirror runtime guardrails in client UX to avoid dead-end interactions. |
| `README.md` + `apps/web/README.md` | Documents mode matrix (`web-only` vs `full`) and exact blocked endpoints in web-only mode. | Keep deployment mode semantics explicit and documented with route-level effects. |
| `docker-compose.yml` | Full-stack compose includes health checks, bootstrap migration/seed, and dependency ordering. | Ship an operable default deployment with health probes and deterministic boot order. |

## Public Ingress Hardening

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/lib/security/webhook-security.ts` | Constant-time secret compare, IP+endpoint Redis rate limits, payload byte caps, JSON/form parsing, header/query sanitation, client IP extraction. | Treat webhook ingress as hostile input and apply layered controls before touching business logic. |
| `apps/web/app/api/webhooks/[workflowId]/[nodeId]/route.ts` | Rejects disabled runtime, enforces trigger config/secret, reserves usage in transaction under lock, enqueues, then rolls back on enqueue failure. | Sequence webhook handling as `guard -> validate -> reserve -> enqueue -> rollback on failure`. |

## Queue, Worker, Realtime Reliability

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/runtime/runReservationLock.ts` | Per-user Redis lock with TTL/wait/retry; fallback bypass when Redis is unavailable. | Serialize run reservation under lock with explicit timeout and graceful fallback policy. |
| `apps/worker/src/scheduler.ts` | DB health checks with retries/timeouts, Redis dedupe keys per schedule bucket, reservation lock before enqueue, rollback on enqueue failure. | Cron systems must be idempotent, health-aware, and rollback-safe. |
| `apps/worker/src/engine/executor.ts` | Per-run lock acquire + heartbeat renew + release; source gating for production automation. | Protect run execution with lock lifecycle management and source policy checks. |
| `apps/realtime/src/index.ts` | Token-verified websocket upgrades, per-run pub/sub channel, ping/pong, idle timeout, token-expiry close, terminal auto-close. | Keep realtime stateless, token-authenticated, and deterministic in connection teardown. |

## Data Model And Usage Governance

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/prisma/schema.prisma` | `UsageRecord` unique on `(userId, month)` and indexed run/workflow tables; auth/session/account entities linked to user. | Encode tenancy and billing constraints directly in schema uniques/indexes. |
| `apps/web/server/routers/workflow.ts` + `apps/web/app/api/webhooks/.../route.ts` | Effective plan recalculation (paid plan expiry fallback to free) and concurrency/monthly limits enforced in reservation transaction. | Compute effective entitlements at execution time and enforce limits atomically. |
| `packages/shared/src/security/crypto.ts` | AES-256-GCM encrypt/decrypt for credential blobs using shared key. | Keep credentials encrypted at rest and decrypt only in execution scope. |
| `packages/shared/src/security/ssrf.ts` | Outbound URL validation blocks private ranges, internal hostnames, and unsafe protocols. | Treat external HTTP node targets as untrusted and enforce SSRF protections centrally. |

## Transfer Guidance

- `clone`: keep Fynt defaults and fail-closed behavior with explicit runtime kill switches.
- `adapt`: preserve safety architecture, remap auth/provider/runtime details to your platform.
- `upgrade`: harden highest-risk ingress and execution paths first, then improve operability and diagnostics.
