# Failure Handling

## Tool Failure

- Detect: Tool throws, exits non-zero, returns invalid output
- Recover: Persist tool error part, stop tool call, continue if possible

## Permission Denial

- Detect: Permission engine resolves `deny`
- Recover: Append error part, stop action

## Repeated Tool Call (Doom Loop)

- Detect: Same tool + same normalized input 3x in a row
- Recover: Trigger doom-loop handling, require user input

## Provider Network Error

- Detect: Transport error before stream completion
- Recover: Apply retry schedule

## Provider Auth Failure

- Detect: 401 response
- Recover: Normalize as `auth` error, stop retries

## Context Overflow

- Detect: Provider returns context-length error OR token budget > 80%
- Recover: Run compaction agent, continue from compact state

## MCP Server Offline

- Detect: Connect or call transport failure
- Recover: Mark server offline, remove dynamic tools

## Server Restart During Session

- Detect: Runtime state gone but DB shows running
- Recover: Mark sessions interrupted on boot, allow user resume
