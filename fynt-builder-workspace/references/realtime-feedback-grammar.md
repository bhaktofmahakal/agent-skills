# Realtime Feedback Grammar

## Event Model

Use structured events:

- `connected` (stream bootstrap success)
- `node` (step status updates)
- `workflow` (run terminal states)
- `socket` (transport lifecycle: connected/disconnected/reconnecting)

## Client Transport Rules

- Prime auth token when available from execute response.
- Maintain per-run connection map (avoid duplicate sockets per run).
- Retry with exponential backoff + jitter.
- Rotate websocket URL candidates to tolerate host mismatches.

## Fallback Rules

- If stream disconnects during active run:
  - switch to polling mode
  - keep updating statuses from run detail
- Show explicit `Polling` badge in panel.
- Reconcile final node states on run terminal.

## Server Relay Rules

- Verify signed token at upgrade.
- Scope socket to one run channel.
- Enforce ping/pong, idle timeout, and token-expiry closure.
- Auto-close shortly after terminal workflow events.

## Safety Rules

- Never trust client-provided run ownership.
- Resolve run ownership server-side before issuing stream token.
- Keep token TTL short and rotate for long sessions.
