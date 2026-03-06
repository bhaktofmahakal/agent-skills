# Source Pattern Map

Use this map first. It links concrete code to transferable runtime rules.

## Typed Workflow Contracts

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/worker/src/engine/types/node-types.ts` | Node data interfaces with explicit per-node fields. | Keep node shape explicit per type to avoid runtime ambiguity. |
| `apps/worker/src/engine/types/schemas.ts` | Zod discriminated unions and passthrough node schemas. | Validate node arrays at runtime with strict discriminators and bounded fields. |
| `apps/worker/src/engine/types/parsers.ts` | Parse helpers that reject non-array node/edge payloads early. | Fail fast at parser boundary before scheduling execution. |
| `packages/shared/src/registry/nodeRegistry.ts` | Single registry for node metadata and categories. | Centralize node taxonomy so editor, validation, and worker use shared semantics. |

## Graph Validation And Execution Semantics

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/core/validation.ts` | Structural + config + connection validation with error/warning severities. | Separate "can execute" blockers from "needs attention" warnings. |
| `apps/worker/src/engine/executor.ts` | Reachability-based execution, condition route activation, skip/bypass logic, terminal status resolution. | Treat runtime as a graph-state machine, not simple topological traversal. |
| `apps/worker/src/engine/graphUtils.ts` | Cycle detection and reachability utilities. | Keep deterministic graph helpers in isolated module for testability. |
| `apps/worker/src/engine/nodeExecutor.ts` | Node run lifecycle with retries, soft-failure coercion, SSE-safe output truncation. | Standardize node execution wrapper for status updates, retry, and error formatting. |

## Secure External Integrations

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/security/ssrf.ts` | Protocol checks, blocked hostnames, DNS resolution, private-IP rejection. | Validate all outbound integration targets before fetch. |
| `apps/worker/src/executors/request/httpExecutor.ts` | Template parsing, timeout abort, content-type handling, truncated text body, hintful errors. | Build generic HTTP node with safe defaults and readable failure hints. |
| `apps/worker/src/executors/request/githubExecutor.ts` | Operation-specific GitHub contract and credential-platform enforcement. | Model each provider operation explicitly with field-level parsing/validation. |
| `apps/worker/src/executors/request/notionExecutor.ts` | ID normalization, JSON template parsing, legacy fallback, detailed error rewriting. | Expect provider quirks and include migration/fallback branches safely. |
| `apps/worker/src/executors/ai/aiExecutor.ts` | Provider-specific JSON prompt schemas, strict template mode, prompt truncation, usage capture. | Keep AI providers behind one adapter with provider-aware validation and limits. |

## Runtime Concurrency, Queue, And Scheduling

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/runtime/runReservationLock.ts` | Per-user reservation lock with retry/timeout and redis fallback. | Serialize quota reservation to avoid race overrun. |
| `apps/worker/src/engine/lockManager.ts` | Per-run lock + heartbeat renew + db fallback when redis unavailable. | Guard idempotency in worker with lock + ownership-based release. |
| `packages/shared/src/runtime/queue.ts` | Queue creation blocked in web-only mode, consistent default retries/backoff. | Hide queue infra behind runtime-gated factory. |
| `apps/worker/src/scheduler.ts` | Minute polling, DB health checks, cron dedupe key, reservation, enqueue rollback. | Scheduler must be idempotent and budget-aware. |
| `apps/worker/src/worker.ts` | Worker concurrency config and fail/error hooks. | Keep worker startup thin, observable, and supervised. |

## Template Variables And Strict Mode

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/core/parser.ts` | Template token parser with `json` helper and missing variable metadata. | Use template parser that returns both output and missing-variable diagnostics. |
| `apps/worker/src/executors/*` | `strict_template_v1` mode throws on missing variables or incomplete config. | Support strict and legacy modes to phase in reliability without breaking old flows. |

## Realtime Propagation

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/worker/src/engine/nodeExecutor.ts` and `executor.ts` | Redis publish node/workflow events. | Emit structured event payloads from engine as first-class runtime output. |
| `apps/realtime/src/index.ts` | Signed token websocket relay + redis subscriber + idle/ping/token-expiry handling. | Keep realtime transport stateless and auth-scoped to run/user. |
| `apps/web/lib/executions/executionSocketClient.ts` | Connection multiplexing, retry backoff, host fallback, token refresh. | Client stream layer must tolerate endpoint mismatch and socket churn. |
