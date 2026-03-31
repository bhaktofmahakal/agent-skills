# STATE AND SESSION SPECIFICATION

This document defines the complete state and session system for the agent platform.

---

## 1. DATABASE SCHEMA (COMPLETE)

### Projects

```sql
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  directory TEXT NOT NULL,
  root TEXT NOT NULL,
  git_root TEXT,
  worktree TEXT,
  sandboxes TEXT,
  name TEXT,
  icon TEXT,
  initialized INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Sessions

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  workspace_id TEXT,
  directory TEXT NOT NULL,
  parent_id TEXT,
  title TEXT,
  summary TEXT,
  agent TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL,
  permission_mode TEXT DEFAULT 'default',
  revert_state TEXT,
  share_token TEXT,
  archived INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project(id),
  FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  FOREIGN KEY (parent_id) REFERENCES session(id)
);
```

### Messages

```sql
CREATE TABLE message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  format TEXT,
  structured_output TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES session(id)
);
```

**Roles**: `user`, `assistant`, `tool`, `system`

### Message Parts

```sql
CREATE TABLE message_part (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  type TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES message(id)
);
```

**Part Types**: `text`, `file`, `tool`, `reasoning`, `patch`, `snapshot`, `agent`, `subtask`, `compaction`, `retry`, `step_start`, `step_finish`, `error`

### Sync Events

```sql
CREATE TABLE sync_event (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  session_id TEXT,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

**Sequence**: Monotonic per project

### Permission Rules

```sql
CREATE TABLE permission_rule (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  pattern TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project(id)
);
```

---

## 2. SESSION RUNTIME METADATA (IN-MEMORY)

```typescript
interface SessionRuntime {
  status: SessionStatus
  stepCount: number
  pendingToolCalls: Map<string, ToolCall>
  abortController: AbortController | null
  lastMessageId: string | null
  toolCallCount: Map<string, number>
  currentMessageId: string | null
}

type SessionStatus = 
  | 'idle'
  | 'running'
  | 'waiting_permission'
  | 'waiting_question'
  | 'waiting_subtask'
  | 'compacting'
  | 'aborted'
  | 'errored'
```

---

## 3. DATABASE IMPLEMENTATION

```typescript
class Database {
  private db: Bun.SQLite.Database
  
  constructor(path: string) {
    this.db = new Bun.SQLite(path)
    this.init()
  }
  
  private init(): void {
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA synchronous = NORMAL')
    this.createTables()
  }
  
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)()
  }
  
  async insert(table: string, row: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(row)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(row)
    
    await this.db.exec(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    )
  }
  
  async update(table: string, id: string, updates: Record<string, unknown>): Promise<void> {
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ')
    const values = [...Object.values(updates), id]
    
    await this.db.exec(
      `UPDATE ${table} SET ${sets} WHERE id = ?`,
      values
    )
  }
  
  query<T>(table: string, filters: Record<string, unknown>): T[] {
    const where = Object.keys(filters).map(k => `${k} = ?`).join(' AND ')
    const values = Object.values(filters)
    
    return this.db.query<T>(
      `SELECT * FROM ${table} WHERE ${where}`,
      values
    ).all()
  }
}
```

---

## 4. SESSION SERVICE

```typescript
interface SessionService {
  create(input: CreateSessionInput): Promise<Session>
  get(id: string): Promise<Session | null>
  list(projectId: string): Promise<Session[]>
  addMessage(sessionId: string, message: CreateMessageInput): Promise<Message>
  appendPart(messageId: string, part: MessagePart): Promise<void>
  setStatus(sessionId: string, status: SessionStatus): Promise<void>
  setError(sessionId: string, error: string): Promise<void>
  getRuntime(sessionId: string): SessionRuntime
  getMessages(sessionId: string, options?: MessageQueryOptions): Promise<Message[]>
  getTokenBudget(sessionId: string): Promise<TokenBudget>
  spawnChild(parentId: string, agent: string): Promise<Session>
  resumeChild(taskId: string): Promise<Session>
}
```

---

## 5. EVENT CATALOG

```typescript
type SyncEvent =
  | { type: 'project.created'; project: Project }
  | { type: 'project.updated'; project: Project }
  | { type: 'session.created'; session: Session }
  | { type: 'session.updated'; session: Session }
  | { type: 'session.deleted'; sessionId: string }
  | { type: 'session.idle'; sessionId: string }
  | { type: 'message.created'; message: Message }
  | { type: 'message.updated'; message: Message }
  | { type: 'message.part.updated'; messageId: string; part: MessagePart }
  | { type: 'permission.asked'; request: PermissionRequest }
  | { type: 'permission.replied'; requestId: string; decision: 'allow' | 'deny' }
  | { type: 'question.asked'; question: QuestionRequest }
  | { type: 'question.replied'; questionId: string; answers: string[][] }
  | { type: 'question.rejected'; questionId: string }
  | { type: 'mcp.server.updated'; server: string; state: McpServerState }
  | { type: 'mcp.tools.changed'; server: string }
  | { type: 'pty.created'; pty: PtySession }
  | { type: 'pty.exited'; ptyId: string }
  | { type: 'tool.started'; callId: string; tool: string }
  | { type: 'tool.finished'; callId: string; tool: string }
```

---

## 6. MESSAGE REPLAY MODEL

To build model request:

```
1. Read recent message rows
2. Order parts by order_index
3. Convert tool parts into tool-call and tool-result messages
4. Inject compact summaries when present
5. Drop pruned historical turns after compaction
```

---

## 7. EPHEMERAL STORES (IN-MEMORY)

Stored in instance memory (NOT SQLite):

- Pending permission requests
- Pending question requests
- Active PTY sessions and subscribers
- Abort controllers for running sessions
- Hot tool registry cache
- Live MCP client connections

---

This state and session specification is COMPLETE and DETERMINISTIC.