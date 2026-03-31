# Failure Handling Edge Cases

## Tool Failure

- Detection: Tool throws, exits non-zero, returns invalid output
- Recovery: Persist tool error part, stop tool call, continue if possible

## Permission Denial

- Detection: Permission engine resolves `deny`
- Recovery: Append assistant error part, stop action

## Permission Ask Timeout

- Detection: No reply within configured wait window
- Recovery: Leave session in waiting_permission, allow manual resume

## Repeated Identical Tool Call

- Detection: Same tool + same normalized input 3 times
- Recovery: Trigger doom-loop handling, require user input

## Provider Network Reset

- Detection: Transport error before stream completion
- Recovery: Apply transient retry schedule

## Provider Auth Failure

- Detection: 401 or provider-specific auth error
- Recovery: Normalize as auth error, stop retries

## Context Overflow

- Detection: Provider returns context-length error OR token budget > 80%
- Recovery: Run compaction, continue from compact state

## MCP Server Offline

- Detection: Connect or call transport failure
- Recovery: Mark server offline, remove dynamic tools

## MCP OAuth State Mismatch

- Detection: Callback state does not match pending state
- Recovery: Reject callback, clear pending auth

## Invalid MCP Schema

- Detection: Tool or prompt cannot be validated
- Recovery: Mark server invalid, don't register tools

## Child Session Failure

- Detection: Child session ends with normalized error
- Recovery: Return failed task result to parent

## Server Restart During Session

- Detection: In-memory state gone but DB shows running
- Recovery: Mark sessions interrupted on boot

## Question Rejection

- Detection: User rejects pending question
- Recovery: Raise normalized error back to blocked tool call

## PTY Reconnect with Cursor

- Detection: Client reconnects with prior cursor
- Recovery: Replay buffered output from cursor, resume streaming
