# ARCHITECTURE SPECIFICATION

This document defines the complete, deterministic architecture for the agent platform.

---

## 1. FIVE-LAYER ARCHITECTURE

### Layer 1: Client Surfaces

**Location**: `packages/app`, `packages/desktop`, `packages/desktop-electron`, `sdks/vscode`, `github`

**Responsibilities**:
- Render project, session, message, tool, diff, and permission UI
- Connect to server through generated SDK clients
- Maintain local ephemeral UI state only
- Consume authoritative state through REST + SSE

**Implementation**:
```typescript
// Client SDK generated from OpenAPI spec
import { Client } from '@my-agent/sdk'

const client = new Client({
  baseUrl: 'http://127.0.0.1:4096',
  directory: '/project/path'
})

// SSE for real-time updates
const events = new EventSource('/event', {
  headers: { 'x-opencode-directory': '/project/path' }
})
```

### Layer 2: Control Plane Server

**Location**: `packages/opencode/src/server/server.ts`

**Framework**: Hono

**Implementation**:
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { serve } from '@hono/node-server'

const app = new Hono()

app.use('*', cors())
app.use('*', compress())
app.use('*', logger())

app.get('/health', (c) => c.json({ healthy: true }))
app.get('/ready', (c) => c.json({ ready: true }))

app.route('/', router)

serve({
  fetch: app.fetch,
  port: 4096,
  hostname: '127.0.0.1',
})
```

### Layer 3: Instance Router

**Location**: `packages/opencode/src/server/router.ts`, `instance.ts`

**Responsibilities**:
- Resolve active directory from headers/query
- Materialize project instance keyed by directory
- Mount instance-scoped routes
- Proxy remote workspace requests

**Implementation**:
```typescript
const instances = new Map<string, ProjectInstance>()

export function router(): Hono {
  const r = new Hono()
  
  // Global routes (no directory)
  r.get('/global/config', handler)
  
  // Instance-scoped middleware
  r.use('/*', async (c, next) => {
    const directory = c.req.header('x-opencode-directory') 
                      || c.req.query('directory')
    if (!directory) return c.json({ error: 'directory required' }, 400)
    
    const instance = getInstance(directory)
    if (!instance) return c.json({ error: 'project not found' }, 404)
    
    c.set('instance', instance)
    await next()
  })
  
  // Mount domain routes
  r.route('/project', projectRouter)
  r.route('/session', sessionRouter)
  r.route('/event', eventRouter)
  r.route('/permission', permissionRouter)
  r.route('/question', questionRouter)
  r.route('/mcp', mcpRouter)
  r.route('/pty', ptyRouter)
  
  return r
}
```

### Layer 4: Runtime Services

**Location**: `packages/opencode/src/`

#### project/
Repository discovery, worktree resolution, project identity

```typescript
interface ProjectService {
  discover(directory: string): Promise<Project>
  getGitRoot(directory: string): Promise<string | null>
  getWorktree(project: Project): Promise<Worktree | null>
}
```

#### session/
Messages, prompts, stream processor, compaction, retries

```typescript
interface SessionService {
  create(input: CreateSessionInput): Promise<Session>
  addMessage(sessionId: string, message: Message): Promise<Message>
  appendPart(messageId: string, part: MessagePart): Promise<void>
  setStatus(sessionId: string, status: SessionStatus): Promise<void>
  getRuntime(sessionId: string): SessionRuntime
}
```

#### tool/
Tool registry and implementations

```typescript
interface ToolRegistry {
  get(name: string): ToolDef<any, any> | undefined
  getAll(): ToolDef<any, any>[]
  register(tool: ToolDef<any, any>): void
  unregister(name: string): void
  filter(ctx: ToolCtx, tools: ToolDef<any, any>[]): ToolDef<any, any>[]
}
```

#### agent/
Agent definitions and config overlays

```typescript
interface AgentService {
  get(name: string): AgentDefinition | undefined
  getAll(): AgentDefinition[]
  run(agent: string, input: AgentInput): Promise<AgentOutput>
}
```

#### permission/
Rule evaluation and approval

```typescript
interface PermissionEngine {
  check(tool: string, input: unknown): Promise<PermissionResult>
  addRule(projectId: string, rule: PermissionRule): Promise<void>
  removeRule(projectId: string, ruleId: string): Promise<void>
}
```

#### mcp/
MCP servers, tools, prompts, resources, auth

```typescript
interface McpClient {
  connect(config: McpServerConfig): Promise<void>
  disconnect(name: string): Promise<void>
  callTool(server: string, tool: string, input: unknown): Promise<unknown>
  getTools(name: string): string[]
  getAllStates(): Record<string, McpServerState>
}
```

#### plugin/
Plugin loading and hooks

```typescript
interface PluginManager {
  load(path: string): Promise<Plugin>
  unload(id: string): Promise<void>
  invoke(hook: string, ctx: HookContext): Promise<unknown>
}
```

#### provider/
Model adapters and auth

```typescript
interface ProviderManager {
  get(providerId: string): Provider | undefined
  stream(request: ModelRequest): Promise<AsyncIterator<StreamEvent>>
  getModels(providerId: string): Model[]
}
```

#### question/
Deferred user-question requests

```typescript
interface QuestionService {
  create(sessionId: string, question: string): Promise<QuestionRequest>
  reply(questionId: string, answers: string[][]): Promise<void>
  reject(questionId: string): Promise<void>
}
```

#### pty/
Terminal session management

```typescript
interface PtyService {
  create(config: PtyConfig): Promise<PtySession>
  connect(ptyId: string): WebSocket
  resize(ptyId: string, cols: number, rows: number): Promise<void>
  write(ptyId: string, data: string): Promise<void>
  delete(ptyId: string): Promise<void>
}
```

#### memory/
Auto-memory, consolidation (KAIROS)

```typescript
interface MemoryService {
  track(toolResult: ToolResult): void
  consolidate(messages: Message[], budget: TokenBudget): Promise<MemorySummary>
  getRelevant(query: string): MemoryItem[]
}
```

#### coordinator/
Multi-agent coordination

```typescript
interface CoordinatorService {
  orchestrate(task: string, agents: string[]): Promise<CoordinationResult>
  spawnChild(parentId: string, agent: string, task: string): Promise<Session>
  mergeResults(children: Session[]): Promise<string>
}
```

### Layer 5: Persistence and Sync

**Location**: `packages/opencode/src/storage/`, `packages/opencode/src/sync/`

#### storage/
SQLite connection, migrations, transactions

```typescript
interface Storage {
  transaction<T>(fn: () => Promise<T>): Promise<T>
  insert(table: string, row: Record<string, unknown>): Promise<void>
  update(table: string, id: string, updates: Record<string, unknown>): Promise<void>
  query<T>(table: string, filters: Record<string, unknown>): T[]
}
```

#### sync/
Durable events and publisher

```typescript
interface SyncPublisher {
  emit<T>(type: string, payload: T, sessionId?: string): Promise<void>
  subscribe(listener: (event: SyncEvent) => void): () => void
}
```

---

## 2. DATA FLOW ARCHITECTURE

### End-to-End Data Path

1. User input enters Solid client
2. Client calls SDK → HTTP request to Bun server
3. Server writes durable state → emits sync events
4. Prompt loop streams provider output into message parts
5. SSE broadcasts event envelopes
6. Client sync store merges envelopes into cached state
7. UI components render from sync store

**CRITICAL**: Never let provider stream bypass persistence layer.

---

## 3. INTERFACE DEFINITIONS

### Project Instance

```typescript
interface ProjectInstance {
  directory: string
  storage: Storage
  sync: SyncPublisher
  project: ProjectService
  session: SessionService
  tool: ToolRegistry
  agent: AgentService
  permission: PermissionEngine
  mcp: McpClient
  plugin: PluginManager
  provider: ProviderManager
  question: QuestionService
  pty: PtyService
  memory: MemoryService
  coordinator: CoordinatorService
}
```

### Session Context

```typescript
interface SessionCtx {
  project: ProjectInstance
  session: Session
  agent: Agent
  provider: Provider
  tool: ToolRegistry
  permission: PermissionEngine
  sync: SyncPublisher
  abort: AbortSignal
}
```

### Tool Definition

```typescript
interface ToolDef<I, O> {
  name: string
  description: string
  permission: string
  input: z.ZodType<I>
  output: z.ZodType<O>
  enabled: (ctx: ToolCtx) => boolean
  execute: (ctx: ToolCtx, input: I) => Promise<O>
}
```

### Agent Definition

```typescript
interface AgentDefinition {
  name: string
  description: string
  mode: 'primary' | 'subagent' | 'internal'
  model?: { providerID: string; modelID: string }
  temperature: number
  maxSteps: number
  tools: string[]
  permissions: Record<string, 'allow' | 'ask' | 'deny'>
  prompt: string
  visible: boolean
}
```

---

## 4. PLUGIN HOOK BOUNDARIES

Implemented at these boundaries:

| Hook | Trigger | Context |
|------|---------|---------|
| `experimental.chat.system.transform` | Before building system prompt | System prompt parts |
| `experimental.chat.messages.transform` | Before building messages | Message array |
| `chat.params` | Before API call | Model parameters |
| `chat.headers` | Before API call | HTTP headers |
| `tool.definition` | Tool registration | Tool definition |
| `tool.execute.before` | Tool execution | Tool name, input |
| `tool.execute.after` | Tool execution | Tool name, output |
| `command.execute.before` | CLI command | Command, args |
| `shell.env` | Bash execution | Environment vars |
| `event` | Any event emission | Event data |

---

## 5. ARCHITECTURE DECISIONS

### Why These Choices?

1. **Hono**: Lightweight, fast, TypeScript-native
2. **SQLite**: Local-first, simple, reliable with WAL
3. **SSE**: Simple, firewall-friendly, real-time
4. **Solid**: Performance, fine-grained reactivity
5. **Bun**: Fast startup, native SQLite, good TypeScript support
6. **Child sessions for sub-agents**: Durable, replayable, isolated

### Scaling Path

- Single instance: SQLite with WAL
- Multi-instance: PostgreSQL + Redis for sessions
- Load balancer: nginx or cloud LB

### Security Model

- Permission engine with allow/ask/deny
- Project-level rules
- Session-level overrides
- MCP OAuth for remote servers

---

This architecture is COMPLETE and DETERMINISTIC. Every component has explicit interfaces and responsibilities.