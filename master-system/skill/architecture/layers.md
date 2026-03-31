# Five-Layer Architecture Breakdown

## Layer 1: Client Surfaces

### packages/app - Shared Solid Client
The core web interface used by:
- Local web browser access
- Embedded desktop shells
- Tauri and Electron wrappers

**Key Components:**
```
packages/app/src/
├── components/
│   ├── prompt-input/
│   ├── message-list/
│   ├── tool-use/
│   ├── permission-dialog/
│   └── question-dialog/
├── context/
│   ├── global-sdk.tsx     # SDK client with directory scoping
│   ├── global-sync.tsx   # SSE event synchronization
│   ├── sync.tsx          # Per-directory state sync
│   └── app-state.tsx     # React state management
├── pages/
│   ├── session.tsx       # Active session view
│   ├── project-list.tsx  # Project selection
│   └── settings.tsx      # Configuration
└── app.tsx               # Main app entry
```

**Rendering Responsibilities:**
- Project list and selection
- Session timeline with messages
- Tool call display and results
- Permission request dialogs
- Question/answer interface
- Todo list management

**State Management:**
- Use Solid's createStore for reactive state
- Separate global state (config, providers) from directory-scoped state
- Optimistic updates for user messages, reconciled via SSE

### packages/desktop - Tauri Wrapper
Native desktop shell around the shared web app with:
- Filesystem permissions scoped to active project
- System tray integration
- Native menus

### packages/desktop-electron - Electron Wrapper
Alternative desktop shell with:
- Auto-update hooks
- Shell integration
- Native menus

### sdks/vscode - VS Code Integration
Extension that:
- Opens/focuses local agent UI
- Provides inline chat integration
- Shows diffs in editor

### github - GitHub Automation
Action package that:
- Shells out to CLI with repo context
- Handles issue/PR comments
- Provides workflow automation

---

## Layer 2: Control Plane Server

**Location**: `packages/opencode/src/server/server.ts`

### Server Initialization
```typescript
async function createServer(): Promise<Server> {
  const app = new Hono()
  
  // Middleware
  app.use('*', cors())
  app.use('*', compress())
  app.use('*', logger())
  app.use('*', cache())
  
  // Global routes (no instance required)
  app.get('/health', handleHealth)
  app.get('/ready', handleReady)
  app.get('/global/config', handleGlobalConfig)
  app.get('/global/log', handleGlobalLog)
  app.get('/global/doc', handleGlobalDoc)
  
  // Event stream (global SSE)
  app.get('/event', handleEventStream)
  
  // Mount workspace router
  app.route('/', createWorkspaceRouter())
  
  return serve({
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  })
}
```

### Global Routes
| Route | Description |
|-------|-------------|
| GET /health | Health check with version |
| GET /ready | Readiness check |
| GET /global/config | Global configuration |
| GET /global/log | Log retrieval |
| GET /global/doc | Documentation |
| GET /event | Global SSE stream |
| POST /global/dispose | Clean shutdown |

### Middleware Stack
1. **CORS**: Allow cross-origin requests from configured origins
2. **Compression**: Gzip response bodies
3. **Logging**: Structured request/response logging
4. **Auth**: Token validation for protected routes
5. **Rate Limiting**: Prevent abuse

---

## Layer 3: Instance Router

**Location**: `packages/opencode/src/server/router.ts`, `instance.ts`

### Directory Resolution
```typescript
async function resolveInstance(c: Context): Promise<ProjectInstance> {
  // Try header first
  let directory = c.req.header('x-opencode-directory')
  
  // Then query param
  if (!directory) {
    directory = c.req.query('directory')
  }
  
  // Then infer from working directory
  if (!directory) {
    directory = process.cwd()
  }
  
  // Resolve to absolute path
  directory = resolve(directory)
  
  // Get or create instance
  let instance = getInstance(directory)
  
  if (!instance) {
    instance = await createInstance(directory)
  }
  
  return instance
}
```

### Instance-Scoped Routes

| Route Group | Description |
|-------------|-------------|
| /project | Project CRUD |
| /session | Session CRUD and prompt execution |
| /message | Message and part operations |
| /permission | Permission requests and replies |
| /question | Question requests and replies |
| /provider | Provider configuration and auth |
| /file | File operations (read, search, list) |
| /mcp | MCP server management |
| /config | User configuration |
| /workspace | Workspace management |
| /pty | PTY session management |
| /agent | Agent definitions |
| /skill | Skill loading |
| /command | Slash command definitions |
| /path | Path information |
| /vcs | Version control status |
| /lsp | LSP status |
| /formatter | Formatter status |

### Request Flow
```
HTTP Request
    ↓
Validate headers, params, query, body (Zod)
    ↓
Resolve active workspace/directory
    ↓
Acquire matching project instance
    ↓
Open storage transaction (if mutation)
    ↓
Execute domain service
    ↓
Persist durable state changes
    ↓
Emit sync events
    ↓
Return JSON or establish SSE stream
```

---

## Layer 4: Runtime Services

### Project Service
**Location**: `packages/opencode/src/project/`

**Responsibilities:**
- Repository discovery (find .git, package.json, etc.)
- Worktree resolution
- Project identity (stable ID generation)
- Bootstrap first-time setup

**Key Types:**
```typescript
interface Project {
  id: string
  directory: string
  root: string
  git_root: string | null
  worktree: string
  sandboxes: string[]
  name: string
  icon: string | null
  initialized: boolean
  created_at: number
  updated_at: number
}

interface ProjectInstance {
  directory: string
  storage: Database
  sync: SseManager
  project: ProjectService
  session: SessionService
  tool: ToolRegistry
  agent: AgentManager
  permission: PermissionEngine
  mcp: McpClient
  plugin: PluginManager
  provider: ProviderManager
  pty: PtyManager
}
```

### Session Service
**Location**: `packages/opencode/src/session/`

**Responsibilities:**
- Message storage and retrieval
- Prompt loop execution
- Stream processing
- Summaries and compaction
- Retry handling

**Session States:**
- `idle`: No active work
- `running`: Processing prompts
- `waiting_permission`: Blocked on user permission
- `waiting_question`: Blocked on user question
- `waiting_subtask`: Blocked on child session
- `compacting`: Running compaction
- `aborted`: Interrupted by user
- `errored`: Failed with error

### Tool Registry
**Location**: `packages/opencode/src/tool/`

**Responsibilities:**
- Built-in tool registration
- Dynamic tool loading (config, plugins, MCP)
- Tool execution
- Permission evaluation
- Result normalization

### Agent Manager
**Location**: `packages/opencode/src/agent/`

**Responsibilities:**
- Built-in agent definitions
- Config overlay loading
- Agent selection for requests
- Tool/permission mapping

### Permission Engine
**Location**: `packages/opencode/src/permission/`

**Responsibilities:**
- Rule evaluation
- Approval persistence
- Permission requests
- Project-level approvals

**Permission Actions:**
- `allow`: Execute immediately
- `ask`: Prompt user, pause execution
- `deny`: Return error, do not execute

### MCP Client
**Location**: `packages/opencode/src/mcp/`

**Responsibilities:**
- Server connection management
- Tool/prompt/resource discovery
- OAuth flow handling
- Dynamic tool registration

### Plugin Manager
**Location**: `packages/opencode/src/plugin/`

**Responsibilities:**
- Internal plugin loading
- External plugin loading
- Hook registration and execution

---

## Layer 5: Persistence And Sync

### SQLite Storage
**Location**: `packages/opencode/src/storage/`

**Tables:**
- project
- workspace
- session
- message
- message_part
- permission_rule
- provider_auth
- mcp_auth
- snapshot
- share_link
- sync_event
- session_todo

### Sync System
**Location**: `packages/opencode/src/sync/`

**Event Flow:**
```
Service Operation
    ↓
Database Transaction
    ↓
Insert/Update Rows
    ↓
Insert Sync Event (same transaction)
    ↓
SSE Broadcast
    ↓
Client Store Update
    ↓
UI Re-render
```

### Read Models
Build projections for:
- Project list
- Workspace list
- Session list and detail
- Message window (with pagination)
- Active todo list
- Provider auth status
- MCP connection status
- Agent/command/question lists
