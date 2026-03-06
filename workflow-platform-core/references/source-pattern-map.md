# Source Pattern Map

Use this map first. Each concrete source location is paired with a reusable rule.

## Auth Shell And Navigation

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/app/home/layout.tsx` | Route-aware shell switches behavior for editor route (full-height, overflow control). | Keep one auth shell that adapts by route context instead of duplicating layouts. |
| `apps/web/components/layout/app-sidebar.tsx` | Sidebar IA groups "Platform" and "Resources", prefetches key routes. | Treat nav as product IA, not just links. Prefetch high-frequency dashboard routes. |

## Dashboard Pages

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/app/home/page.tsx` | Workflow grid with optimistic create/delete, local cache fallback, search, pagination, rich card states. | For high-frequency list pages, combine optimistic UX + short-lived local cache + robust empty/search states. |
| `apps/web/app/home/templates/page.tsx` | Template catalog with category filtering, metadata-rich cards, and template instantiation helpers. | Separate "template discovery" from "editor" and front-load setup complexity before entering editor. |
| `apps/web/app/home/credentials/page.tsx` | Platform-based credential manager with per-provider fields and safe return path handling. | Model credentials as first-class product objects with provider-specific forms and strict returnTo sanitization. |
| `apps/web/app/home/executions/page.tsx` | Workflow picker + status filters + run detail sheet, mobile pills, desktop split-pane. | Build execution observability as a dedicated surface with responsive list/detail layouts and live updates. |

## Workflow Editor Frontend

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/app/home/workflows/[id]/page.tsx` | React Flow + drawer + run panel + template preflight + route/error states. | Keep editor as a composed system (canvas, config, run telemetry), not a monolithic component. |
| `apps/web/components/workflows/canvas/WorkflowCanvas.tsx` | Validation-aware execute CTA, trigger-specific run-now behavior, context menu and shortcuts. | Gate execution by validation and trigger semantics; expose keyboard-first workflows. |
| `apps/web/app/home/workflows/[id]/hooks/useWorkflowPersistence.ts` | Debounced autosave, snapshot sanitation, graph integrity guard, template graph repair path. | Treat persistence as a reliability subsystem with sanitization, validation, and recovery behavior. |
| `apps/web/app/home/workflows/[id]/hooks/useWorkflowExecution.ts` | Socket status streaming with polling fallback and panel/canvas synchronization. | Always provide dual-path live status: optimistic socket primary plus polling fallback. |

## API Contracts And Limits

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/server/routers/workflow.ts` | Zod input caps, graph shape validation, template non-empty enforcement. | Put hard bounds on graph payload size and validate structure at API boundary. |
| `apps/web/server/routers/workflow.ts` | Execution mutation validates trigger mode combinations and node ownership. | Execution endpoints must reject ambiguous or mismatched trigger contexts. |
| `apps/web/server/routers/workflow.ts` | Plan-aware run reservation with concurrency and monthly limits under lock. | Enforce billing and concurrency atomically before enqueueing runs. |
| `apps/web/server/routers/execution.ts` | Ownership-scoped run list/detail and usage endpoint with effective plan logic. | Keep observability APIs user-scoped and expose plan-derived usage data for UI. |
| `apps/web/server/routers/credentials.ts` | Encrypted key storage, masked retrieval, platform enum checks. | Never store provider secrets in plaintext; return masked values only to client. |

## Runtime, Queue, And Realtime

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `packages/shared/src/runtime/automationFlags.ts` | Runtime mode and production automation gates. | Use explicit runtime modes to disable automation safely in web-only deployments. |
| `packages/shared/src/runtime/queue.ts` | Queue creation blocked in web-only mode. | Fail fast when execution infrastructure is unavailable. |
| `packages/shared/src/runtime/runReservationLock.ts` | Redis lock with TTL/retry and timeout error type. | Serialize run reservation per user to prevent overbooking under concurrent requests. |
| `apps/web/app/api/webhooks/[workflowId]/[nodeId]/route.ts` | Webhook auth, rate limits, payload size guard, run reservation, enqueue rollback. | Treat webhooks as hostile input: verify secret, rate-limit, sanitize payload/header/query, and rollback on enqueue failure. |
| `apps/worker/src/worker.ts` + `apps/worker/src/engine/executor.ts` | BullMQ worker executes graph with node-level updates and final workflow status events. | Worker engine should publish step-level and run-level events for live UI feedback. |
| `apps/worker/src/scheduler.ts` | Cron polling with dedupe keys, health checks, reservation lock, enqueue rollback. | Scheduler runs must be idempotent and budget-aware with explicit dedupe and rollback controls. |
| `apps/realtime/src/index.ts` | Token-verified websocket relay over redis pub/sub with ping/idle/token-expiry policies. | Keep realtime service stateless and token-authenticated; close stale connections deterministically. |
| `apps/web/lib/executions/executionSocketClient.ts` | Client URL candidate strategy, token refresh, reconnect backoff, socket multiplex map. | Client stream layer should be resilient to host mismatch and transient network failures. |

## Transfer Guidance

- `clone`: keep dark canvas + orange accent + same interaction density and information hierarchy.
- `adapt`: retain architecture and reliability patterns, retheme colors/icons/copy.
- `upgrade`: preserve existing product shape, then migrate weakest layers first: execution contract, editor reliability, realtime fallback.
