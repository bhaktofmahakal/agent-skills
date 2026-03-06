# Backend Execution Contracts

## API Boundary Rules

- Validate all workflow graph payloads at create/update boundaries.
- Cap payload size aggressively (title length, node count, edge count, action count).
- Reject template workflows with empty node graphs.
- Require ownership checks for all `getById`, `update`, `delete`, `execute`, and execution-detail reads.

## Workflow Mutations

- `create`:
  - validate graph shape
  - enforce per-plan workflow count limits
  - create trigger/actions atomically with workflow row

- `update`:
  - allow fast path for frequent position-only saves
  - keep full path for trigger/actions updates
  - validate resulting graph shape whenever nodes or edges change

- `execute`:
  - accept one mode only per call:
    - `nodeId` (single node run)
    - `triggerSource + triggerNodeId` (trigger run-now)
    - none (manual workflow execution requiring active manual trigger)
  - reject ambiguous input combinations
  - verify trigger node type and readiness (`isActive`, `isConfigured`)

## Plan And Concurrency Enforcement

- Compute effective plan from persisted plan + paid-until.
- Enforce monthly run caps and concurrent pending run caps.
- Reserve usage and run slot inside a per-user lock and DB transaction.
- Roll back usage reservation if queue enqueue fails.

## Credentials

- Encrypt secrets at rest (`AES-256-GCM` style pattern).
- Return masked keys to UI reads.
- Keep provider/platform enum synchronized between app and DB.

## Webhook Contract

- Verify node belongs to workflow and is webhook type.
- Require and verify secret from header/query with timing-safe comparison.
- Apply IP and endpoint rate limits.
- Guard payload size and malformed JSON.
- Sanitize query/header metadata before storing run metadata.
- Reserve plan usage and concurrency before enqueue.
- Roll back usage on enqueue failure.

## Runtime Mode Contract

- Support explicit runtime mode (`full` and `web-only`).
- In `web-only`, block execution mutations, queue creation, and websocket token routes.
- In production, optionally gate cron/webhook automation behind explicit flag.

## Stream Bootstrap Contract

- Return short-lived signed token for run stream authorization.
- Include optional websocket base URL for multi-host deployments.
- Keep token TTL short and verify signature server-side in realtime relay.
