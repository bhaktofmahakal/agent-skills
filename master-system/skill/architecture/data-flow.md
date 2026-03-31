# Data Flow Through The System

## Overview

Data flows through the system in a predictable pattern:
1. User input enters the Solid client
2. Client calls SDK
3. SDK sends HTTP request to server
4. Server writes durable state and emits sync events
5. Prompt loop streams provider output into message parts
6. SSE broadcasts event envelopes
7. Client sync store merges envelopes into cached session state
8. UI components render from sync store

## Detailed Flow Paths

### 1. User Prompt Flow

```
User types prompt in Solid client
    ↓
Client resolves active directory, session ID, slash command state
    ↓
If no session exists, creates one via POST /session
    ↓
Inserts optimistic user message in client store
    ↓
POST /session/:id/prompt_async with:
  - session_id
  - text
  - agent
  - model
  - files
  - resources
  - format
  - command_mode
    ↓
Server persists real user message
    ↓
Server starts/continues prompt loop
    ↓
Server streams assistant state changes:
  - Database: message parts written
  - SSE: events emitted
    ↓
Client reconciles optimistic message with durable ID
    ↓
UI renders text, reasoning, tool, patch, error parts
```

### 2. Tool Execution Flow

```
Model calls tool
    ↓
Server receives tool call event from stream
    ↓
Validates tool name against registry
    ↓
Validates input against tool schema
    ↓
Evaluates permissions:
  - allow → continue
  - deny → error
  - ask → emit permission request, pause
    ↓
If allowed:
  Emits tool.started event
    ↓
  Executes tool
    ↓
  Validates and normalizes result
    ↓
  Persists tool result part
    ↓
  Emits tool.finished event
    ↓
  Returns result to model loop
```

### 3. Sub-Agent Delegation Flow

```
Model calls task tool with:
  - target agent
  - task description
  - optional context
  - optional existing task_id
    ↓
Task tool validates agent delegation allowed
    ↓
Creates/resumes child session with:
  - parent_id (links to parent)
  - inherited project and directory
  - reduced permissions
  - copied instruction context
    ↓
Child session runs own prompt loop
    ↓
Child finishes with:
  - Normal assistant message
  - Structured output payload
  - Normalized error
    ↓
Parent session stores result in task tool result part
    ↓
If created by slash command, injects synthetic follow-up
```

### 4. SSE Event Flow

```
Server-side event occurs:
  - Message created/updated
  - Permission asked/replied
  - Question asked/replied
  - Session status change
    ↓
Event written to sync_event table (same transaction as data)
    ↓
SseManager.emit() called with event
    ↓
For each connected client:
  - Serialize event envelope
  - Write to SSE response
    ↓
Client EventSource receives message
    ↓
Parse event envelope
    ↓
Update local sync store
    ↓
Trigger UI re-render
```

### 5. Permission Flow

```
Tool call reaches permission engine
    ↓
Engine resolves best matching rule:
  1. Session-specific rules
  2. Project rules
  3. User global rules
  4. Default rules
    ↓
If action is 'allow':
  Continue execution immediately
    ↓
If action is 'deny':
  Persist assistant error part
  Stop the tool
    ↓
If action is 'ask':
  Emit permission.asked event
  Pause session (status = waiting_permission)
  Store pending request in memory
    ↓
User sees permission dialog
    ↓
User replies: once, always, or reject
    ↓
POST /session/:id/permission with reply
    ↓
If reply is 'once':
  Resume tool with stored approval for this call only
    ↓
If reply is 'always':
  Store project-level approval rule
  Resume tool
    ↓
If reply is 'reject':
  Persist rejection error part
  Do not resume tool
```

### 6. Question Flow

```
Model or tool uses question tool
    ↓
Server stores pending question in memory
    ↓
Emits question.asked event
    ↓
Client shows question dock
  - Active session: inline dock
  - Background session: notification
    ↓
User submits answer(s) or rejects
    ↓
POST /question/:id/reply with answers
    OR
POST /question/:id/reject
    ↓
Server emits question.replied or question.rejected
    ↓
Blocked tool call resumes:
  - With answer payload
  - Or raises normalized rejection error
```

### 7. MCP Tool Flow

```
MCP server configured and connected
    ↓
MCP client lists tools from server
    ↓
Dynamic tools registered in tool registry
    ↓
Model sees MCP tools in available tools list
    ↓
Model calls MCP tool
    ↓
Tool validates against MCP tool schema
    ↓
Permission check (mapped to 'mcp' permission)
    ↓
MCP client calls remote tool
    ↓
Result normalized and returned
    ↓
Tool result persisted as message part
```

### 8. State Persistence Flow

```
User Action
    ↓
HTTP Request to Server
    ↓
Zod validation of request body
    ↓
Resolve project instance
    ↓
Open SQLite transaction
    ↓
Execute domain operation
    ↓
Insert/update data rows
    ↓
Insert sync_event row
    ↓
Commit transaction
    ↓
Emit SSE event
    ↓
Return response to client
```

### 9. Client State Sync Flow

```
App loads
    ↓
Create global SDK client (no directory)
    ↓
Fetch /global/config, /provider, /path, /project
    ↓
Mark app globally ready
    ↓
User selects directory
    ↓
Create directory-scoped SDK client
    ↓
Fetch /agent, /config, /session/status, /permission, /question, etc.
    ↓
Open SSE connection to /event
    ↓
For each event received:
  - Parse event envelope
  - Update normalized store
  - Trigger re-render
    ↓
On reconnect:
  - Fetch missed events by sequence
  - Apply in order
```

### Key Data Transformation Points

1. **User Input → Message**: Raw text converted to user message with parts
2. **Provider Stream → Message Parts**: Text, reasoning, tool calls extracted and stored
3. **Tool Output → Normalized Result**: Raw output converted to JSON-safe structure
4. **Sync Event → Client State**: Server event converted to client store update
5. **Database Row → API Response**: Raw SQL results transformed to API shape
