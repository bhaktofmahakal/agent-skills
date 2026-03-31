# API and Event Contracts

## Shared Payloads

### Prompt Request
```typescript
interface PromptRequest {
  sessionId: string
  messageId?: string
  agent?: string
  model?: { providerID: string; modelID: string }
  variant?: string
  format?: unknown
  parts: MessagePart[]
}
```

### Command Request
```typescript
interface CommandRequest {
  sessionId: string
  command: string
  arguments: string
  agent?: string
  model?: string
  variant?: string
  parts?: MessagePart[]
}
```

### Shell Request
```typescript
interface ShellRequest {
  sessionId: string
  agent: string
  model?: { providerID: string; modelID: string }
  command: string
}
```

### Permission Reply
```typescript
interface PermissionReplyRequest {
  requestId: string
  reply: 'once' | 'always' | 'reject'
  message?: string
}
```

### Question Reply
```typescript
interface QuestionReplyRequest {
  requestId: string
  answers: string[][]
}
```

## Global Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /global/config | Get global config |
| GET | /global/log | Get logs |
| GET | /global/doc | Get docs |
| GET | /health | Health check |
| GET | /ready | Readiness check |
| GET | /event | SSE stream |
| POST | /global/dispose | Shutdown |

## Project Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /project | List projects |
| GET | /project/current | Get current project |
| POST | /project/init | Initialize project |
| PATCH | /project/:id | Update project |

## Session Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /session | List sessions |
| GET | /session/status | Get session status |
| POST | /session | Create session |
| GET | /session/:id | Get session |
| GET | /session/:id/children | Get child sessions |
| PATCH | /session/:id | Update session |
| DELETE | /session/:id | Delete session |
| POST | /session/:id/prompt | Submit prompt (sync) |
| POST | /session/:id/prompt_async | Submit prompt (async) |
| POST | /session/:id/command | Run command |
| POST | /session/:id/shell | Run shell |
| POST | /session/:id/abort | Abort session |
| POST | /session/:id/share | Share session |
| POST | /session/:id/unshare | Unshare session |
| POST | /session/:id/summarize | Get summary |

## Message Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /session/:id/message | List messages |
| GET | /session/:id/message/:mid | Get message with parts |
| PATCH | /session/:id/message/:mid | Update message |
| DELETE | /session/:id/message/:mid | Delete message |
| PATCH | /session/:id/message/:mid/part/:pid | Update part |
| DELETE | /session/:id/message/:mid/part/:pid | Delete part |

## Permission Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /permission | List pending permissions |
| POST | /permission/:id/reply | Reply to permission |

## Question Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /question | List pending questions |
| POST | /question/:id/reply | Reply to question |
| POST | /question/:id/reject | Reject question |

## Provider Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /provider | List providers |
| GET | /provider/auth | Get auth status |
| POST | /provider/:name/authorize | Start auth |
| POST | /provider/:name/callback | OAuth callback |

## PTY Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /pty | List PTY sessions |
| POST | /pty | Create PTY |
| GET | /pty/:id | Get PTY |
| PUT | /pty/:id | Update PTY |
| DELETE | /pty/:id | Delete PTY |
| GET | /pty/:id/connect | Connect (WebSocket) |

## MCP Routes

| Method | Path | Description |
|--------|------|--------------|
| GET | /mcp | Get MCP status |
| POST | /mcp/connect | Connect to server |
| POST | /mcp/disconnect | Disconnect server |
| POST | /mcp/auth/start | Start OAuth |
| POST | /mcp/auth/callback | OAuth callback |

## Event Types

### Core Events
- `server.connected`
- `server.heartbeat`
- `project.created`
- `project.updated`
- `workspace.created`
- `session.created`
- `session.updated`
- `session.idle`
- `message.created`
- `message.updated`
- `message.part.updated`
- `permission.asked`
- `permission.replied`
- `question.asked`
- `question.replied`
- `question.rejected`
- `provider.auth.updated`
- `mcp.server.updated`
- `mcp.tools.changed`
- `pty.created`
- `pty.updated`
- `pty.exited`
- `pty.deleted`

### Tool Events
- `tool.started`
- `tool.finished`
- `tool.error`
- `tool.cancelled`

## SSE Event Envelope

```typescript
interface DirectoryEvent {
  directory: string
  payload:
    | { type: 'server.connected'; properties: {} }
    | { type: 'server.heartbeat'; properties: {} }
    | { type: string; properties: Record<string, unknown> }
}
```
