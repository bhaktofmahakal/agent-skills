---
name: fynt-workflow-engine-runtime
description: "Build and upgrade a production-grade workflow automation engine in a Fynt-inspired architecture with typed node contracts, graph validation, dependency-aware execution, secure executor adapters, run locking, scheduler dedupe, and realtime status streaming. Use when implementing n8n-style workflow runtime logic, adding node types, hardening execution correctness, or refactoring worker/scheduler/realtime subsystems."
---

# Fynt Workflow Engine Runtime

Use this skill to extract and apply the backend execution DNA of the platform.

## Invocation Contract

- `$fynt-workflow-engine-runtime mode=clone`
- `$fynt-workflow-engine-runtime mode=adapt`
- `$fynt-workflow-engine-runtime mode=upgrade`

If mode is missing, default to `adapt`.

## Mode Behavior

- `clone`: preserve Fynt runtime patterns closely (BullMQ worker, redis locks, strict template mode, evented run status).
- `adapt`: keep reliability patterns and contracts while fitting another schema, stack, or brand.
- `upgrade`: refactor an existing engine with measurable stability, safety, and observability improvements.

## Required Output Contract

Always include:

1. Runtime architecture plan (API -> queue -> worker -> storage -> realtime).
2. Node contract plan (types, schemas, parse/validation boundaries, config rules).
3. Execution semantics plan (batching, conditional routing, skips, retries, terminal state logic).
4. Executor safety plan (credentials, SSRF protection, payload limits, external API error hints).
5. Scheduling and concurrency plan (cron dedupe, run reservation, lock and rollback design).
6. Realtime status plan (node/workflow event model and socket fallback strategy).
7. Test strategy (unit, integration, failure-injection, idempotency checks).
8. Rubric scorecard and pass/fail decision.

Do not finalize without passing [references/quality-rubric.md](references/quality-rubric.md).

## Workflow

1. Read [references/source-pattern-map.md](references/source-pattern-map.md) first.
2. Load only needed references:
   - [references/engine-architecture-grammar.md](references/engine-architecture-grammar.md)
   - [references/node-authoring-grammar.md](references/node-authoring-grammar.md)
   - [references/executor-safety-grammar.md](references/executor-safety-grammar.md)
   - [references/template-and-variable-grammar.md](references/template-and-variable-grammar.md)
   - [references/runtime-concurrency-and-scheduling.md](references/runtime-concurrency-and-scheduling.md)
   - [references/improvement-playbook.md](references/improvement-playbook.md) for `upgrade`
   - [references/quality-rubric.md](references/quality-rubric.md)
3. Reuse assets when code is requested:
   - [assets/snippets/node-type-contract.ts](assets/snippets/node-type-contract.ts)
   - [assets/snippets/node-executor-template.ts](assets/snippets/node-executor-template.ts)
   - [assets/snippets/secure-http-helper.ts](assets/snippets/secure-http-helper.ts)
   - [assets/snippets/workflow-run-loop.ts](assets/snippets/workflow-run-loop.ts)
4. Score output with rubric; iterate until pass.

## Non-Negotiables

- Enforce typed node contracts and input limits before execution.
- Keep run reservation and concurrency checks atomic under lock.
- Roll back usage reservations when enqueue fails.
- Protect outbound requests against SSRF/private network targets.
- Emit deterministic node and workflow status events.
- Keep fallback behavior when redis/socket services degrade.

## Anti-Patterns To Reject

- Running unvalidated graph payloads directly in worker.
- Node executors that swallow provider errors without actionable hints.
- No dedupe on cron scheduling or no per-run lock in worker.
- Credential handling that leaks secrets or bypasses ownership checks.
- Realtime status that depends on socket-only success.
