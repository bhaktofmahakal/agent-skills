# Bootstrap Specification

This bootstrap specification provides a comprehensive guide for building Claude Code / OpenCode-like agent platforms from scratch. It draws from the actual Claude Code codebase architecture.

## 1. Project Initialization

### Monorepo Setup

```bash
mkdir my-agent-platform
cd my-agent-platform
bun init -y
bun add -d turbo typescript @types/bun vite vitest playwright eslint prettier
```

### Package.json Configuration

```json
{
  "name": "my-agent-platform",
  "private": true,
  "packageManager": "bun@latest",
  "workspaces": ["packages/*", "packages/*/*", "sdks/*"],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

## 2. Core Dependencies

### Runtime Dependencies

```bash
bun add hono zod ai @ai-sdk/openai @ai-sdk/anthropic @modelcontextprotocol/sdk
bun add eventemitter3 remeda ulid ws yargs effect
bun add bun:sqlite
```

### UI Dependencies

```bash
bun add react react-dom ink
bun add @anthropic-ai/sdk
```

## 3. Directory Structure

```
packages/
├── core/                    # Main agent runtime
│   ├── src/
│   │   ├── QueryEngine.ts   # Core orchestration loop
│   │   ├── query.ts        # Per-turn state machine
│   │   ├── Tool.ts         # Tool interface definition
│   │   ├── tools/          # Built-in tools
│   │   ├── services/       # Business logic
│   │   ├── hooks/          # React hooks
│   │   └── state/          # State management
├── ui/                      # Terminal UI (Ink-based)
│   └── src/
│       ├── renderer.tsx
│       ├── REPL.tsx
│       └── components/
├── sdk/                     # Client SDK
└── desktop/                 # Desktop wrapper (Tauri/Electron)
```

## 4. Core Architecture Components

### QueryEngine Implementation

The QueryEngine is the session coordinator - a singleton that persists state across turns:

```typescript
// src/QueryEngine.ts
export class QueryEngine {
  private session: SessionManager
  private tools: ToolRegistry
  private permission: PermissionEngine
  private costTracker: CostTracker
  
  constructor(options: QueryEngineOptions) {
    this.session = options.session
    this.tools = options.tools
    this.permission = options.permission
  }
  
  // Main entry point - AsyncGenerator yielding messages
  async *submitMessage(
    prompt: string, 
    options: SubmitOptions = {}
  ): AsyncGenerator<Message> {
    // 1. Create file history snapshot (for undo)
    await this.createFileSnapshot()
    
    // 2. Persist transcript before API call
    await this.persistTranscript()
    
    // 3. Wrap permission tracking
    const canUseTool = this.wrapPermissionChecks()
    
    // 4. Enter query loop
    yield* this.query(prompt, { ...options, canUseTool })
  }
  
  // Coordinate system context building
  async buildSystemContext(): Promise<SystemContext> {
    const [gitStatus, claudeMdFiles, date] = await Promise.all([
      this.getGitStatus(),
      this.getClaudeMdFiles(),
      this.getDate(),
    ])
    
    return { gitStatus, claudeMdFiles, date }
  }
}
```

### Query Loop Implementation

The query loop is a resilient state machine:

```typescript
// src/query.ts
export async function* query(
  ctx: QueryContext
): AsyncGenerator<Message> {
  const state: QueryState = {
    messages: [],
    toolUseContext: createToolAvailabilityContext(),
    maxOutputTokensRecoveryCount: 0,
    autoCompactTracking: createCompactState(),
    transition: 'start',
  }
  
  while (true) {
    // 1. Prefetch memory + skills (parallel)
    const [memory, skills] = await Promise.all([
      prefetchMemory(state),
      prefetchSkills(state),
    ])
    
    // 2. Apply message compaction
    if (shouldCompact(state)) {
      await applyCompaction(state)
    }
    
    // 3. Call API with streaming
    const stream = await callClaudeAPI(ctx)
    
    // 4. Handle streaming errors
    const result = await handleStreamErrors(stream, state)
    if (result.transition === 'complete') {
      return result.message
    }
    
    // 5. Execute tools
    const toolResults = await executeTools(result.toolCalls, ctx)
    
    // 6. Check recovery paths
    const recovery = checkRecoveryPaths(state, toolResults)
    if (recovery.shouldRecover) {
      state.transition = recovery.reason
      continue
    }
    
    // 7. Continue or return
    if (shouldTerminate(state)) {
      return result.message
    }
    
    state.messages.push(...toolResults)
    state.transition = 'tool_complete'
  }
}
```

## 5. Tool System Implementation

### Tool Interface

Every tool conforms to this generic interface:

```typescript
// src/Tool.ts
export interface Tool<Input, Output, Progress> {
  name: string
  description(input: Input): string
  prompt(): string
  inputSchema: ZodSchema<Input>
  
  call(
    input: Input, 
    context: ToolContext, 
    canUseTool: CanUseToolFn
  ): Promise<ToolResult<Output>>
  
  checkPermissions(input: Input): PermissionResult
  validateInput(input: Input): ValidationResult
  isConcurrencySafe(input: Input): boolean
  
  // Rendering (4-tier)
  renderToolUseMessage(input: Input): ReactNode
  renderToolUseProgressMessage(progress: Progress): ReactNode
  renderToolResultMessage(output: Output): ReactNode
  renderToolUseErrorMessage(error: Error): ReactNode
}
```

### Tool Registry

Tools are loaded through a feature-gated registry:

```typescript
export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tool[]
): Tool[] {
  // 1. Get built-ins filtered by deny rules
  const builtins = getTools(permissionContext)
  
  // 2. Filter MCP tools by deny rules
  const filteredMcp = filterToolsByDenyRules(mcpTools, permissionContext)
  
  // 3. Deduplicate (built-ins win)
  const combined = uniqBy([...builtins, ...filteredMcp], 'name')
  
  // 4. Sort alphabetically for prompt cache stability
  return combined.sort((a, b) => a.name.localeCompare(b.name))
}
```

### Deferred Tool Discovery

Not all tools are sent to the model in every request:

```typescript
// ~18 tools are deferred - only loaded on demand
const DEFERRED_TOOLS = [
  'lsp_*',
  'TaskCreateTool',
  'McpTool',
  'SkillTool',
  'EnterPlanModeTool',
]

// Model explicitly searches for tools
async function handleToolSearch(query: string): Promise<ToolSchema[]> {
  const results = DEFERRED_TOOLS.filter(tool => 
    tool.matches(query)
  )
  return results.map(tool => tool.getSchema())
}
```

## 6. Permission System

### Permission Modes

Five public modes + two internal modes:

```typescript
type PermissionMode = 
  | 'default'     // Ask for destructive
  | 'plan'        // Read-only
  | 'acceptEdits' // Auto-approve edits
  | 'bypassPermissions' // Full access
  | 'dontAsk'     // Auto-deny unsafe
  | 'auto'        // ML classifier (internal)
  | 'bubble'      // Delegation (internal)
```

### Permission Evaluation

```typescript
async function evaluatePermission(
  toolName: string,
  input: unknown,
  context: PermissionContext
): Promise<PermissionResult> {
  // 1. Check mode-specific rules
  const modeResult = checkModeRules(toolName, context.mode)
  if (modeResult.action !== 'default') {
    return modeResult
  }
  
  // 2. Check project rules
  const projectResult = checkProjectRules(toolName, input)
  if (projectResult) {
    return projectResult
  }
  
  // 3. Check global rules
  return checkGlobalRules(toolName, input)
}
```

## 7. Session Management

### Session State

```typescript
interface Session {
  id: string
  projectId: string
  messages: Message[]
  createdAt: Date
  lastUpdatedAt: Date
  model: string
  costTotal: number
}
```

### Transcript Persistence

Transcripts are persisted to JSONL for resumability:

```typescript
async function persistTranscript(session: Session): Promise<void> {
  const path = join(TRANSCRIPT_DIR, `${session.id}.jsonl`)
  const stream = createWriteStream(path)
  
  for (const msg of session.messages) {
    stream.write(JSON.stringify(msg) + '\n')
  }
  
  await stream.end()
}
```

## 8. Context Compaction

### Compaction Strategies

1. **Snip**: Remove oldest messages while preserving system prompt
2. **Microcompact**: Summarize recent exchanges
3. **Context collapse**: Progressive summarization

```typescript
async function compactMessages(
  messages: Message[],
  budget: TokenBudget
): Promise<CompactedMessages> {
  if (messages.length < 10) {
    return { messages, strategy: 'none' }
  }
  
  if (budget.used > budget.limit * 0.8) {
    return await microcompact(messages)
  }
  
  return await snip(messages, budget.targetLength)
}
```

## 9. MCP Integration

### MCP Client

```typescript
class McpClient {
  private connections = new Map<string, McpConnection>()
  
  async connect(config: McpServerConfig): Promise<void> {
    const transport = config.transport === 'stdio'
      ? new StdioTransport(config)
      : new HttpTransport(config)
    
    await transport.initialize()
    this.connections.set(config.name, transport)
  }
  
  async listTools(): Promise<McpTool[]> {
    const tools: McpTool[] = []
    for (const conn of this.connections.values()) {
      const result = await conn.listTools()
      tools.push(...result.tools)
    }
    return tools
  }
}
```

## 10. Bridge & Remote Control

### Bridge Architecture

```typescript
class BridgeClient {
  private ws: WebSocket
  private queue: WorkItem[] = []
  
  async pollForWork(): Promise<WorkItem | null> {
    const response = await this.api.poll()
    if (response.work) {
      return response.work
    }
    return null
  }
  
  async acknowledgeWork(workId: string): Promise<void> {
    await this.api.ack(workId)
  }
  
  spawnSession(work: WorkItem): ChildProcess {
    return spawn('claude', [
      '--continue',
      '--session-id', work.sessionId,
    ])
  }
}

Replace the root `package.json` with:

```json
{
  "name": "opencode-rebuild",
  "private": true,
  "packageManager": "bun@latest",
  "workspaces": [
    "packages/*",
    "packages/*/*",
    "sdks/*",
    "github"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "sdk:build": "bun run --cwd packages/sdk/js script/build.ts"
  }
}
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM"],
    "allowJs": false,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@opencode-ai/util/*": ["packages/util/src/*"],
      "@opencode-ai/ui/*": ["packages/ui/src/*"],
      "@opencode-ai/sdk/*": ["packages/sdk/js/src/*"]
    }
  }
}
```

Create `.gitignore`:

```gitignore
node_modules
.turbo
dist
build
.output
.env
.env.local
coverage
playwright-report
test-results
```

## 2. Create The Directory Layout

Create this tree:

```text
packages/
  app/
    src/
      components/
      context/
      pages/
  desktop/
  desktop-electron/
  enterprise/
  opencode/
    src/
      agent/
      command/
      config/
      file/
      formatter/
      instruction/
      lsp/
      mcp/
      permission/
      plugin/
      project/
      provider/
      server/
        routes/
      session/
      storage/
      sync/
      tool/
      vcs/
  sdk/
    js/
      script/
      src/
        v2/
  slack/
  ui/
    src/
  util/
    src/
  web/
github/
sdks/
  vscode/
```

## 3. Create The Core Packages

### `packages/opencode`

Run:

```bash
bun add --cwd packages/opencode hono hono-openapi zod ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @modelcontextprotocol/sdk eventemitter3 remeda ulid ws yargs effect
```

Use `bun:sqlite` from the Bun runtime for SQLite access.

Create `packages/opencode/package.json`:

```json
{
  "name": "@opencode-ai/opencode",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "opencode": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts serve",
    "build": "bun build src/index.ts --outdir dist",
    "typecheck": "bunx tsc -p tsconfig.json --noEmit",
    "test": "bun test"
  }
}
```

Create `packages/opencode/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### `packages/app`

Run:

```bash
bun add --cwd packages/app solid-js @tanstack/solid-query @solidjs/router
bun add --cwd packages/app zod
bun add -d --cwd packages/app vite vite-plugin-solid typescript
```

Create `packages/app/package.json` with scripts `dev`, `build`, `typecheck`, and `test`.
Create `packages/app/tsconfig.json` extending the root base config.
Create `packages/app/vite.config.ts` using `vite-plugin-solid`.

### `packages/sdk/js`

Run:

```bash
bun add --cwd packages/sdk/js @hey-api/openapi-ts
```

Create `packages/sdk/js/package.json` with `script/build.ts` as the SDK generator entrypoint.
Create `packages/sdk/js/tsconfig.json` extending the root base config.

### `packages/ui` and `packages/util`

Create lean shared packages for components, formatting helpers, event types, and cross-runtime utilities.

### `packages/desktop`

Create a Tauri wrapper around the shared web app.

### `packages/desktop-electron`

Create an Electron wrapper around the shared web app.

### `github`

Create a GitHub Action package that shells out to the local CLI entrypoint with repository context.

### `sdks/vscode`

Create a VS Code extension that starts or focuses the local server and UI.

## 4. Create The Root Environment Files

Create `.env.example`:

```dotenv
OPENCODE_HOST=127.0.0.1
OPENCODE_PORT=4096
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_WEB_URL=http://127.0.0.1:5173
OPENCODE_DATA_DIR=.data
OPENCODE_CONFIG_DIR=.config
OPENCODE_DISABLE_MDNS=0
OPENCODE_MCP_CALLBACK_PORT=19876
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
OPENCODE_EXA_API_KEY=
OPENCODE_GITHUB_TOKEN=
```

Create `.env.staging` and `.env.production` with the same keys and deployment-specific values.

## 5. Create The Runtime Entrypoints

Create these files first:

- `packages/opencode/src/index.ts`
- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/server/router.ts`
- `packages/opencode/src/server/instance.ts`
- `packages/opencode/src/server/routes/global.ts`
- `packages/opencode/src/server/routes/project.ts`
- `packages/opencode/src/server/routes/session.ts`
- `packages/opencode/src/server/routes/event.ts`
- `packages/opencode/src/server/routes/config.ts`
- `packages/opencode/src/server/routes/question.ts`
- `packages/opencode/src/server/routes/permission.ts`
- `packages/opencode/src/server/routes/provider.ts`
- `packages/opencode/src/server/routes/mcp.ts`
- `packages/opencode/src/server/routes/workspace.ts`
- `packages/opencode/src/server/routes/pty.ts`
- `packages/opencode/src/project/instance.ts`
- `packages/opencode/src/project/project.ts`
- `packages/opencode/src/project/bootstrap.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/session/processor.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/opencode/src/session/llm.ts`
- `packages/opencode/src/session/instruction.ts`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/permission/index.ts`
- `packages/opencode/src/question/index.ts`
- `packages/opencode/src/mcp/index.ts`
- `packages/opencode/src/plugin/index.ts`
- `packages/app/src/app.tsx`
- `packages/app/src/context/global-sdk.tsx`
- `packages/app/src/context/global-sync.tsx`
- `packages/app/src/context/sync.tsx`
- `packages/app/src/components/prompt-input/submit.ts`
- `packages/sdk/js/script/build.ts`

## 6. Wire The Initial Scripts

After creating package manifests, add these root commands:

```bash
bun run build
bun run typecheck
bun run test
```

The first working developer loop must be:

```bash
bun run --cwd packages/opencode src/index.ts serve
bun run --cwd packages/app dev
```

## 7. Bootstrap Order Inside `packages/opencode`

Implement this order:

1. `storage/`
2. `sync/`
3. `project/`
4. `permission/`
5. `agent/`
6. `tool/`
7. `mcp/`
8. `plugin/`
9. `session/`
10. `server/`

Do not start the web client until the server can:

- discover a project
- create a session
- accept a prompt
- emit SSE events
- return message history

Create `packages/web`, `packages/console`, `packages/enterprise`, and `packages/slack` before leaving bootstrap, even if they begin as entrypoint placeholders.

## 8. Database Schema Creation

Create SQLite tables in this order:

```sql
-- Projects table
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

-- Workspaces table
CREATE TABLE workspace (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  directory TEXT NOT NULL,
  branch TEXT,
  remote TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project(id)
);

-- Sessions table
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

-- Messages table
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

-- Message parts table
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

-- Permission rules table
CREATE TABLE permission_rule (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  pattern TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project(id)
);

-- Provider auth table
CREATE TABLE provider_auth (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  provider TEXT NOT NULL,
  auth_data TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES project(id)
);

-- MCP auth table
CREATE TABLE mcp_auth (
  id TEXT PRIMARY KEY,
  server_url TEXT NOT NULL,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expiry INTEGER,
  pkce_verifier TEXT,
  pending_state TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Snapshots table
CREATE TABLE snapshot (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES session(id),
  FOREIGN KEY (message_id) REFERENCES message(id)
);

-- Share links table
CREATE TABLE share_link (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES session(id)
);

-- Sync events table
CREATE TABLE sync_event (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  session_id TEXT,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Session todo table
CREATE TABLE session_todo (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  text TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES session(id)
);

-- Create indexes for performance
CREATE INDEX idx_session_project ON session(project_id);
CREATE INDEX idx_message_session ON message(session_id);
CREATE INDEX idx_message_part_message ON message_part(message_id);
CREATE INDEX idx_sync_event_project ON sync_event(project_id, sequence);
CREATE INDEX idx_sync_event_session ON sync_event(session_id, sequence);
```

## 9. Initial Server Implementation

### Server Entry Point (packages/opencode/src/server/server.ts)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { serve } from '@hono/node-server'
import { router } from './router.js'
import { createInstance, getInstance } from './instance.js'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', compress())
app.use('*', logger())

// Health and ready routes
app.get('/health', (c) => c.json({ healthy: true, version: '0.1.0' }))
app.get('/ready', (c) => c.json({ ready: true }))

// Mount the router
app.route('/', router)

const port = parseInt(process.env.OPENCODE_PORT || '4096')
const host = process.env.OPENCODE_HOST || '127.0.0.1'

console.log(`Starting server on ${host}:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: host,
})

// Initialize default instance
createInstance(process.cwd())
```

### Instance Manager (packages/opencode/src/server/instance.ts)

```typescript
import { Hono } from 'hono'
import { projectRouter } from './routes/project.js'
import { sessionRouter } from './routes/session.js'
import { eventRouter } from './routes/event.js'
import { configRouter } from './routes/config.js'
import { permissionRouter } from './routes/permission.js'
import { questionRouter } from './routes/question.js'
import { providerRouter } from './routes/provider.js'
import { mcpRouter } from './routes/mcp.js'
import { workspaceRouter } from './routes/workspace.js'
import { ptyRouter } from './routes/pty.js'
import { agentRouter } from './routes/agent.js'
import { skillRouter } from './routes/skill.js'
import { commandRouter } from './routes/command.js'
import { pathRouter } from './routes/path.js'
import { vcsRouter } from './routes/vcs.js'
import { lspRouter } from './routes/lsp.js'
import { formatterRouter } from './routes/formatter.js'
import type { ProjectInstance } from '../project/instance.js'

const instances = new Map<string, ProjectInstance>()

export function createInstance(directory: string): ProjectInstance {
  const instance: ProjectInstance = {
    directory,
    // Initialize all services here
    storage: null, // Will be initialized
    sync: null,
    project: null,
    session: null,
    tool: null,
    agent: null,
    permission: null,
    mcp: null,
    plugin: null,
    provider: null,
    pty: null,
  }
  instances.set(directory, instance)
  return instance
}

export function getInstance(directory: string): ProjectInstance | undefined {
  return instances.get(directory)
}

export function deleteInstance(directory: string): void {
  instances.delete(directory)
}

export function getAllInstances(): Map<string, ProjectInstance> {
  return instances
}

// Create the router with instance scoping
export function router(): Hono {
  const r = new Hono()
  
  // Global routes (no instance required)
  r.get('/global/config', async (c) => {
    // Return global config
  })
  
  // Instance-scoped routes
  r.use('/*', async (c, next) => {
    const directory = c.req.header('x-opencode-directory') || c.req.query('directory')
    if (!directory) {
      return c.json({ error: 'directory required' }, 400)
    }
    const instance = getInstance(directory)
    if (!instance) {
      return c.json({ error: 'project not found' }, 404)
    }
    c.set('instance', instance)
    await next()
  })
  
  // Mount all route groups
  r.route('/project', projectRouter)
  r.route('/session', sessionRouter)
  r.route('/event', eventRouter)
  r.route('/config', configRouter)
  r.route('/permission', permissionRouter)
  r.route('/question', questionRouter)
  r.route('/provider', providerRouter)
  r.route('/mcp', mcpRouter)
  r.route('/workspace', workspaceRouter)
  r.route('/pty', ptyRouter)
  r.route('/agent', agentRouter)
  r.route('/skill', skillRouter)
  r.route('/command', commandRouter)
  r.route('/path', pathRouter)
  r.route('/vcs', vcsRouter)
  r.route('/lsp', lspRouter)
  r.route('/formatter', formatterRouter)
  
  return r
}
```

## 10. Tool Registry Implementation

### Tool Definition (packages/opencode/src/tool/registry.ts)

```typescript
import type { z } from 'zod'

export interface ToolDef<I, O> {
  name: string
  description: string
  permission: string
  input: z.ZodType<I>
  output: z.ZodType<O>
  enabled: (ctx: ToolCtx) => boolean
  execute: (ctx: ToolCtx, input: I) => Promise<O>
}

export interface ToolCtx {
  project: ProjectInstance
  session: Session
  agent: Agent
  provider: Provider
  permission: PermissionEngine
  logger: Logger
  abort: AbortSignal
}

export interface ToolRegistry {
  get(name: string): ToolDef<any, any> | undefined
  getAll(): ToolDef<any, any>[]
  register(tool: ToolDef<any, any>): void
  unregister(name: string): void
  filter(ctx: ToolCtx, tools: ToolDef<any, any>[]): ToolDef<any, any>[]
}

// Built-in tool implementations
export const builtinTools: ToolDef<any, any>[] = [
  // Question tool
  {
    name: 'question',
    description: 'Ask the user a question',
    permission: 'question',
    input: z.object({
      prompt: z.string(),
    }),
    output: z.object({
      answers: z.array(z.array(z.string())),
      asked: z.literal(true),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const question = await ctx.session.createQuestion(input.prompt)
      await ctx.session.waitForAnswer(question.id)
      return { answers: question.answers, asked: true }
    },
  },
  
  // Bash tool
  {
    name: 'bash',
    description: 'Execute a shell command',
    permission: 'bash',
    input: z.object({
      command: z.string(),
      cwd: z.string().optional(),
      timeout_ms: z.number().optional(),
    }),
    output: z.object({
      stdout: z.string(),
      stderr: z.string(),
      exit_code: z.number(),
      duration_ms: z.number(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const start = Date.now()
      const result = await execShell(input.command, {
        cwd: input.cwd || ctx.project.directory,
        timeout: input.timeout_ms,
      })
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exitCode,
        duration_ms: Date.now() - start,
      }
    },
  },
  
  // Read tool
  {
    name: 'read',
    description: 'Read a file',
    permission: 'read',
    input: z.object({
      path: z.string(),
      start: z.number().optional(),
      end: z.number().optional(),
    }),
    output: z.object({
      path: z.string(),
      text: z.string(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const text = await readFile(input.path, input.start, input.end)
      return { path: input.path, text }
    },
  },
  
  // Glob tool
  {
    name: 'glob',
    description: 'Find files matching a pattern',
    permission: 'glob',
    input: z.object({
      pattern: z.string(),
      cwd: z.string().optional(),
    }),
    output: z.object({
      matches: z.array(z.string()),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const cwd = input.cwd || ctx.project.directory
      const matches = await glob(input.pattern, cwd)
      return { matches }
    },
  },
  
  // Grep tool
  {
    name: 'grep',
    description: 'Search for text in files',
    permission: 'grep',
    input: z.object({
      pattern: z.string(),
      cwd: z.string().optional(),
      limit: z.number().optional(),
    }),
    output: z.object({
      matches: z.array(z.object({
        path: z.string(),
        line: z.number(),
        text: z.string(),
      })),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const cwd = input.cwd || ctx.project.directory
      const matches = await grep(input.pattern, cwd, input.limit)
      return { matches }
    },
  },
  
  // Edit tool
  {
    name: 'edit',
    description: 'Edit a file',
    permission: 'edit',
    input: z.object({
      path: z.string(),
      old: z.string(),
      new: z.string(),
      replace_all: z.boolean().optional(),
    }),
    output: z.object({
      path: z.string(),
      changed: z.boolean(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const changed = await editFile(input.path, input.old, input.new, input.replace_all)
      return { path: input.path, changed }
    },
  },
  
  // Write tool
  {
    name: 'write',
    description: 'Write a file',
    permission: 'write',
    input: z.object({
      path: z.string(),
      text: z.string(),
    }),
    output: z.object({
      path: z.string(),
      bytes: z.number(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const bytes = await writeFile(input.path, input.text)
      return { path: input.path, bytes }
    },
  },
  
  // Apply patch tool
  {
    name: 'apply_patch',
    description: 'Apply a patch to files',
    permission: 'apply_patch',
    input: z.object({
      patch: z.string(),
    }),
    output: z.object({
      files: z.array(z.string()),
    }),
    enabled: (ctx) => ctx.provider.supportsPatch,
    execute: async (ctx, input) => {
      const files = await applyPatch(input.patch, ctx.project.directory)
      return { files }
    },
  },
  
  // Task tool (sub-agent delegation)
  {
    name: 'task',
    description: 'Delegate to a sub-agent',
    permission: 'task',
    input: z.object({
      agent: z.string(),
      task: z.string(),
      context: z.string().optional(),
      task_id: z.string().optional(),
    }),
    output: z.object({
      task_id: z.string(),
      result: z.string(),
      status: z.enum(['completed', 'error']),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const child = input.task_id
        ? await ctx.session.resumeChild(input.task_id)
        : await ctx.session.spawnChild(input.agent)
      
      await child.prompt(input.task, input.context)
      const result = await child.waitForCompletion()
      
      return {
        task_id: child.id,
        result: result.summary,
        status: result.error ? 'error' : 'completed',
      }
    },
  },
  
  // Web fetch tool
  {
    name: 'webfetch',
    description: 'Fetch a URL',
    permission: 'webfetch',
    input: z.object({
      url: z.string().url(),
    }),
    output: z.object({
      url: z.string(),
      status: z.number(),
      text: z.string(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const response = await fetch(input.url)
      const text = await response.text()
      return {
        url: input.url,
        status: response.status,
        text,
      }
    },
  },
  
  // Todo write tool
  {
    name: 'todowrite',
    description: 'Write todo items',
    permission: 'todowrite',
    input: z.object({
      items: z.array(z.object({
        text: z.string(),
        done: z.boolean(),
      })),
    }),
    output: z.object({
      count: z.number(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      await ctx.session.setTodo(input.items)
      return { count: input.items.length }
    },
  },
  
  // Web search tool
  {
    name: 'websearch',
    description: 'Search the web',
    permission: 'websearch',
    input: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
    output: z.object({
      results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const results = await webSearch(input.query, input.limit)
      return { results }
    },
  },
  
  // Code search tool
  {
    name: 'codesearch',
    description: 'Search code repositories',
    permission: 'codesearch',
    input: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
    output: z.object({
      hits: z.array(z.object({
        path: z.string(),
        snippet: z.string(),
        score: z.number(),
      })),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const hits = await codeSearch(input.query, input.limit)
      return { hits }
    },
  },
  
  // Skill tool
  {
    name: 'skill',
    description: 'Load a skill',
    permission: 'skill',
    input: z.object({
      name: z.string(),
      path: z.string().optional(),
    }),
    output: z.object({
      path: z.string(),
      content: z.string(),
    }),
    enabled: () => true,
    execute: async (ctx, input) => {
      const content = await loadSkill(input.name, input.path)
      return { path: input.path || input.name, content }
    },
  },
]
```

## 11. Session Prompt Loop

### Main Loop Implementation

```typescript
export async function promptLoop(ctx: SessionCtx): Promise<void> {
  for (;;) {
    // Load current state
    const state = await loadSessionState(ctx)
    
    // Check for pending subtask
    if (state.pendingSubtask) {
      await runSubtask(ctx, state.pendingSubtask)
      continue
    }
    
    // Check if compaction is needed
    if (state.needsCompaction) {
      await runCompaction(ctx)
      continue
    }
    
    // Create new assistant message
    const msg = await ctx.session.createAssistantMessage()
    
    // Build model request
    const req = await buildModelRequest(ctx, state, msg)
    
    // Start streaming
    const stream = await ctx.provider.stream(req)
    
    // Process stream events
    const result = await processStream(ctx, msg, stream)
    
    // Check termination conditions
    if (result.status === 'structured_output_complete') {
      return
    }
    
    if (result.status === 'done' && !result.pendingToolCalls.length) {
      return
    }
    
    // Continue loop for tool calls
  }
}

async function loadSessionState(ctx: SessionCtx): Promise<SessionState> {
  const session = await ctx.session.getRuntime()
  
  // Check for pending subtask
  const pendingParts = await ctx.session.getParts(session.lastMessageId)
  const subtaskPart = pendingParts.find(p => p.type === 'subtask')
  
  // Check token budget
  const budget = await ctx.session.getTokenBudget()
  const needsCompaction = budget.used / budget.total > 0.8
  
  return {
    pendingSubtask: subtaskPart,
    needsCompaction,
    messages: await ctx.session.getMessages(),
    tools: await ctx.tool.getAvailable(ctx),
  }
}

async function buildModelRequest(
  ctx: SessionCtx,
  state: SessionState,
  msg: Message
): Promise<ModelRequest> {
  // Build system prompt
  const systemPrompt = await buildSystemPrompt(ctx, state)
  
  // Convert messages to model format
  const modelMessages = await convertMessagesToModel(ctx, state.messages)
  
  // Get available tools
  const tools = await ctx.tool.getToolsForModel(ctx, state.agent)
  
  return {
    model: ctx.session.model,
    system: systemPrompt,
    messages: modelMessages,
    tools,
    maxTokens: ctx.session.maxTokens,
  }
}

async function processStream(
  ctx: SessionCtx,
  msg: Message,
  stream: ModelStream
): Promise<ProcessResult> {
  let pendingToolCalls: ToolCall[] = []
  let structuredOutput: unknown = null
  
  for await (const event of stream) {
    switch (event.type) {
      case 'text-delta':
        await msg.appendText(event.text)
        break
        
      case 'reasoning-delta':
        await msg.appendReasoning(event.text)
        break
        
      case 'tool-call':
        const toolCall = await msg.appendToolCall(event.name, event.input)
        pendingToolCalls.push(toolCall)
        break
        
      case 'tool-result':
        await msg.setToolResult(event.callId, event.result)
        pendingToolCalls = pendingToolCalls.filter(t => t.id !== event.callId)
        break
        
      case 'finish':
        if (event.structuredOutput) {
          structuredOutput = event.structuredOutput
        }
        break
    }
    
    // Emit sync event
    ctx.sync.emit({
      type: 'message.part.updated',
      sessionId: ctx.session.id,
      messageId: msg.id,
      part: event,
    })
  }
  
  // Execute pending tool calls
  for (const toolCall of pendingToolCalls) {
    await executeToolCall(ctx, msg, toolCall)
  }
  
  return {
    status: structuredOutput ? 'structured_output_complete' : 'done',
    pendingToolCalls,
  }
}

async function executeToolCall(
  ctx: SessionCtx,
  msg: Message,
  toolCall: ToolCall
): Promise<void> {
  // Check permission
  const allowed = await ctx.permission.check(toolCall.name, toolCall.input)
  if (!allowed) {
    await msg.setToolError(toolCall.id, 'permission_denied')
    return
  }
  
  // Execute tool
  const result = await ctx.tool.execute(toolCall.name, toolCall.input, ctx)
  
  // Store result
  await msg.setToolResult(toolCall.id, result)
}
```

## 12. MCP Integration

### MCP Client Implementation

```typescript
export interface McpServerConfig {
  name: string
  transport: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  url?: string
  cwd?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  enabled: boolean
  auth?: {
    type: 'none' | 'oauth'
  }
}

export interface McpServerState {
  name: string
  transport: 'stdio' | 'http' | 'sse'
  status: 'disconnected' | 'connecting' | 'connected' | 'offline' | 'auth_required' | 'invalid'
  url?: string
  command?: string
  tools: string[]
  prompts: string[]
  resources: string[]
  error?: string
}

export class McpClient {
  private servers = new Map<string, McpServerState>()
  private connections = new Map<string, McpConnection>()
  
  async connect(config: McpServerConfig): Promise<void> {
    const state: McpServerState = {
      name: config.name,
      transport: config.transport,
      status: 'connecting',
    }
    
    this.servers.set(config.name, state)
    
    try {
      let connection: McpConnection
      
      if (config.transport === 'stdio') {
        connection = await this.connectStdio(config)
      } else if (config.transport === 'http' || config.transport === 'sse') {
        connection = await this.connectHttp(config)
      } else {
        throw new Error(`Unknown transport: ${config.transport}`)
      }
      
      this.connections.set(config.name, connection)
      
      // Initialize
      await connection.initialize()
      
      // List tools
      const toolsResult = await connection.listTools()
      state.tools = toolsResult.tools.map(t => t.name)
      
      // List prompts
      const promptsResult = await connection.listPrompts()
      state.prompts = promptsResult.prompts.map(p => p.name)
      
      // List resources
      const resourcesResult = await connection.listResources()
      state.resources = resourcesResult.resources.map(r => r.uri)
      
      state.status = 'connected'
      
    } catch (error) {
      state.status = 'offline'
      state.error = String(error)
      throw error
    }
  }
  
  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name)
    if (connection) {
      await connection.close()
      this.connections.delete(name)
    }
    
    const state = this.servers.get(name)
    if (state) {
      state.status = 'disconnected'
      state.tools = []
      state.prompts = []
      state.resources = []
    }
  }
  
  async callTool(name: string, toolName: string, input: unknown): Promise<unknown> {
    const connection = this.connections.get(name)
    if (!connection) {
      throw new Error(`Not connected to ${name}`)
    }
    
    return connection.callTool(toolName, input)
  }
  
  getTools(name: string): string[] {
    return this.servers.get(name)?.tools || []
  }
  
  getPrompts(name: string): string[] {
    return this.servers.get(name)?.prompts || []
  }
  
  getResources(name: string): string[] {
    return this.servers.get(name)?.resources || []
  }
  
  getServerState(name: string): McpServerState | undefined {
    return this.servers.get(name)
  }
  
  getAllServerStates(): Record<string, McpServerState> {
    return Object.fromEntries(this.servers)
  }
}
```

## 13. SSE Event Streaming

### Event Streaming Implementation

```typescript
export class SseManager {
  private clients = new Set<SseClient>()
  private sequence = 0
  
  addClient(client: SseClient): void {
    this.clients.add(client)
    
    // Send initial connection event
    this.emit({
      type: 'server.connected',
      properties: {},
    })
  }
  
  removeClient(client: SseClient): void {
    this.clients.delete(client)
  }
  
  emit<T>(event: SyncEvent<T>): void {
    this.sequence++
    const envelope: EventEnvelope = {
      sequence: this.sequence,
      type: event.type,
      payload: event.properties,
      timestamp: Date.now(),
    }
    
    // Send to all clients
    for (const client of this.clients) {
      client.send(envelope)
    }
    
    // Also persist to database
    this.persistEvent(envelope)
  }
  
  private async persistEvent(envelope: EventEnvelope): Promise<void> {
    // Store in sync_event table
    await db.insert('sync_event', {
      id: generateId(),
      project_id: envelope.projectId,
      session_id: envelope.sessionId,
      sequence: envelope.sequence,
      type: envelope.type,
      payload_json: JSON.stringify(envelope.payload),
      created_at: Date.now(),
    })
  }
}

// Client-side SSE connection
export function connectSse(
  url: string,
  onEvent: (event: EventEnvelope) => void,
  onError: (error: Error) => void
): SseConnection {
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  let eventSource: EventSource | null = null
  
  const connect = (): void => {
    eventSource = new EventSource(url)
    
    eventSource.onmessage = (message) => {
      // Reset heartbeat
      if (heartbeatTimer) clearTimeout(heartbeatTimer)
      heartbeatTimer = setTimeout(() => {
        console.error('SSE heartbeat timeout')
        eventSource?.close()
        scheduleReconnect()
      }, 25000)
      
      // Parse and emit event
      const envelope = JSON.parse(message.data)
      onEvent(envelope)
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      eventSource?.close()
      scheduleReconnect()
    }
  }
  
  const scheduleReconnect = (): void => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, 2000)
  }
  
  // Start connection
  connect()
  
  // Return cleanup function
  return () => {
    if (heartbeatTimer) clearTimeout(heartbeatTimer)
    if (reconnectTimer) clearTimeout(reconnectTimer)
    eventSource?.close()
  }
}
```
