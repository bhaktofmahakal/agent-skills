# Runtime Mode And Deployment Ops

## Runtime Modes

### `web-only`

- Keep product UI and editor usable.
- Block execution mutation paths server-side.
- Block webhook ingestion endpoints.
- Block websocket token issuance routes.
- Show clear client UX that execution is unavailable.

### `full`

- Enable queue, worker, realtime, webhook, and cron execution paths.
- Require explicit production automation switch before allowing webhook/cron in production.

## Production Safety Switch

Use two independent controls:

1. Runtime mode (`FYNT_RUNTIME_MODE`): structural capability boundary.
2. Automation in production (`FYNT_ENABLE_AUTOMATION_IN_PRODUCTION=true`): explicit operational intent.

Default production posture should be conservative (`web-only` or automation disabled unless explicitly enabled).

## Deployment Topology Baseline

For full mode, deploy:

- Web app/API
- Worker/queue processor
- Realtime relay
- Postgres
- Redis

Operational essentials:

- health checks for each service
- bootstrap migration/seed job with ordered dependencies
- explicit restart policies
- predictable host/port and env wiring

## Environment Contract

Required classes of environment variables:

- Auth and signing secrets
- Encryption key
- Runtime mode flags
- Database connection
- Redis connection
- Realtime URL/signing values

Document mode-specific required variables to prevent partial deploy failures.

## Operational Runbooks

Define quick checks for:

- auth outage
- redis unavailable
- database timeout
- realtime disconnected/no events
- enqueue failures
- webhook abuse spikes

Each runbook should include:

1. Detection signal
2. Immediate mitigation (temporary kill switch/rate tighten/degrade path)
3. Recovery verification
4. Post-incident follow-up

## Release Checklist

- Runtime mode set intentionally.
- Automation flag reviewed for environment.
- All secrets present and non-placeholder.
- Health endpoints green across services.
- Webhook and execute endpoints behave correctly per mode.
- Realtime token route works only for owned runs.
