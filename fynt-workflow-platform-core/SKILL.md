---
name: fynt-workflow-platform-core
description: Build and upgrade authenticated workflow-automation product surfaces and backend execution architecture in a Fynt-inspired system using Next.js, Tailwind CSS, Framer Motion, React Flow, tRPC, BullMQ, Redis, and websocket streaming. Use when creating or refactoring post-auth dashboard UX, workflow editor pages, credentials and executions screens, workflow API contracts, webhook/cron execution paths, or realtime run-status infrastructure.
---

# Fynt Workflow Platform Core

Use this skill for Phase 2 quality work: post-auth product UX plus execution backend correctness.

## Invocation Contract

- `$fynt-workflow-platform-core mode=clone`
- `$fynt-workflow-platform-core mode=adapt`
- `$fynt-workflow-platform-core mode=upgrade`

If mode is missing, default to `adapt`.

## Mode Behavior

- `clone`: stay closest to Fynt product DNA (dark shell, orange accents, dense-but-readable cards, React Flow editor behavior, queue+socket runtime model).
- `adapt`: preserve architecture and reliability patterns while retheming and renaming for another brand/product.
- `upgrade`: transform an existing authenticated app and backend to this quality bar with explicit before/after improvements.

## Required Output Contract

Always include all items before finalizing:

1. Product information architecture and section/page map.
2. Frontend interaction plan (dashboard states, editor behavior, list/detail flows, responsive behavior).
3. Motion and feedback plan (entry/hover/loading/state transitions + reduced-motion path).
4. Backend contract plan (query/mutation schemas, limits, validation, ownership checks).
5. Execution lifecycle plan (UI -> API -> queue -> worker -> redis pub/sub -> websocket client fallback).
6. Security and reliability plan (credentials, rate limits, locks, retries, rollback strategy).
7. Accessibility and performance checks.
8. Rubric scorecard with pass/fail.

Do not finalize without a pass from [references/quality-rubric.md](references/quality-rubric.md).

## Workflow

1. Identify mode and whether scope is `greenfield` or `existing code upgrade`.
2. Read [references/source-pattern-map.md](references/source-pattern-map.md) first.
3. Load only needed references:
   - [references/dashboard-ux-grammar.md](references/dashboard-ux-grammar.md)
   - [references/editor-grammar.md](references/editor-grammar.md)
   - [references/backend-execution-contracts.md](references/backend-execution-contracts.md)
   - [references/realtime-runtime-grammar.md](references/realtime-runtime-grammar.md)
   - [references/improvement-playbook.md](references/improvement-playbook.md) (required in `upgrade`)
   - [references/quality-rubric.md](references/quality-rubric.md)
4. Reuse starter scaffolds when code is requested:
   - [assets/snippets/dashboard-shell.tsx](assets/snippets/dashboard-shell.tsx)
   - [assets/snippets/workflow-editor-shell.tsx](assets/snippets/workflow-editor-shell.tsx)
   - [assets/snippets/workflow-router-contract.ts](assets/snippets/workflow-router-contract.ts)
   - [assets/snippets/webhook-route-contract.ts](assets/snippets/webhook-route-contract.ts)
5. Perform strict rubric scoring and iterate until pass.

## Non-Negotiables

- Keep runtime-mode gating explicit (`full` vs `web-only`) for execution paths.
- Enforce graph validation and template graph integrity before persistence.
- Guard executions with ownership checks, plan limits, and concurrency limits.
- Keep reduced-motion support in authenticated UX, not only marketing pages.
- Provide fallback behavior for realtime status (socket disconnect -> polling).
- Keep credential handling encrypted and never expose raw secrets in UI payloads.

## Anti-Patterns To Reject

- Pretty dashboard with no execution correctness contract.
- Generic CRUD editor without graph validation, autosave safeguards, or undo/redo.
- Webhook endpoints without secret verification, rate limits, or plan reservation checks.
- Realtime status flows that fail silently on socket drops.
- Platform outputs that ignore mobile behavior, loading states, or empty/error states.

## Framework Baseline

Default target stack is Next.js + Tailwind CSS + Framer Motion + React Flow + tRPC + BullMQ + Redis + WebSocket.
