# Reusable Patterns

## Instance-Scoped Context

- Key every live project instance by directory
- Keep runtime services attached to instance
- Dispose when project unloads or process exits

## Append-Only Transcript

- Never overwrite message meaning
- Append parts as work progresses
- Represent retries, compaction, tool calls, errors as parts

## Event-Backed Views

- Write durable rows + sync events in one transaction
- Update UI read models from projectors
- Broadcast same event payloads over SSE

## Prompt Assembly Pipeline

1. Collect instructions
2. Collect environment data
3. Collect tool set
4. Collect MCP resources
5. Collect reminders
6. Build final system prompt
7. Stream model output

## Permission Gate

- Perform permission lookup before any side effect
- Suspend work on `ask`
- Persist approvals for `always`
- Normalize denials into transcript-visible errors

## Child Session Delegation

- Create child session, not in-memory worker
- Inherit context deliberately
- Reduce permissions
- Merge only final result back to parent

## Optimistic Client State

- Insert user message optimistically
- Replace with durable server object when first sync event arrives
- Never let optimistic state outlive authoritative record
