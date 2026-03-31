# MASTER SYSTEM SPECIFICATION

This is the COMPREHENSIVE, DETERMINISTIC specification for building a Claude Code–class agent system. This document is the SINGLE SOURCE OF TRUTH.

## SYSTEM IDENTITY

A local-first, provider-agnostic multi-agent coding platform with:
- CLI for local development
- HTTP API server with project-scoped routing
- Shared web client for interactive sessions
- TypeScript SDK for programmatic access
- Built-in agents for different tasks
- Tool registry with permission management
- MCP (Model Context Protocol) integration
- Sub-agent delegation through child sessions
- Hidden features: KAIROS memory, ULTRAPLAN planning, coordinator mode

## NON-NEGOTIABLE STACK

- Runtime: Bun
- Language: TypeScript (everywhere except shell helpers)
- HTTP Framework: Hono
- Validation: Zod
- AI Runtime: Vercel AI SDK + provider adapters
- Client: Solid + Vite
- Persistence: SQLite (bun:sqlite)
- Event Transport: Server-Sent Events (SSE)
- Desktop: Tauri and Electron
- Package Orchestration: Bun workspaces + Turbo

---

# PART I: SYSTEM ARCHITECTURE

## 1. Five-Layer Architecture

### Layer 1: Client Surfaces
- `packages/app`: Shared Solid client
- `packages/desktop`: Tauri wrapper
- `packages/desktop-electron`: Electron wrapper
- `sdks/vscode`: VS Code integration
- `github`: GitHub automation entrypoint

### Layer 2: Control Plane Server
- Location: `packages/opencode/src/server/server.ts`
- Framework: Hono HTTP server
- Responsibilities: Start Bun HTTP server, expose /global routes, apply middleware

### Layer 3: Instance Router
- Location: `packages/opencode/src/server/router.ts` and `instance.ts`
- Responsibilities: Resolve active directory, materialize project instance

### Layer 4: Runtime Services
- `project/`: Repository discovery, worktree resolution
- `session/`: Messages, prompts, stream processor, compaction
- `tool/`: Tool registry and implementations
- `agent/`: Agent definitions
- `permission/`: Rule evaluation
- `mcp/`: MCP servers, tools, auth
- `plugin/`: Plugin loading
- `provider/`: Model adapters
- `question/`: Question requests
- `pty/`: Terminal sessions
- `memory/`: Auto-memory, consolidation (KAIROS)
- `coordinator/`: Multi-agent coordination

### Layer 5: Persistence And Sync
- `storage/`: SQLite connection
- `sync/`: Durable events and publisher

## 2. Request Lifecycle (DETERMINISTIC)

1. Accept HTTP request at Hono server
2. Validate headers, params, query, body with Zod
3. Resolve active workspace or directory
4. Acquire matching project instance
5. Open storage transaction if mutation
6. Execute domain service
7. Persist durable state changes
8. Emit sync events and bus events
9. Return JSON or establish SSE stream

## 3. Prompt Lifecycle (DETERMINISTIC)

1. Create or resolve session
2. Create user message and its parts
3. Resolve active agent, provider, model, instructions, tools, permissions, MCP resources
4. Enter prompt loop
5. If pending subtask exists, run task tool continuation
6. If compaction required, run compaction agent
7. Start new assistant message and stream model output
8. Persist every stream event as message parts
9. Execute tool calls through registry
10. Loop until assistant completes with no pending tool calls
11. Mark session idle, publish final sync events

## 4. Tool Execution Lifecycle (DETERMINISTIC)

1. Validate tool name against active registry
2. Validate input against tool schema
3. Evaluate permissions
4. Emit `tool.started` event
5. Execute tool
6. Validate and normalize tool result
7. Persist tool result or tool error part
8. Emit `tool.finished` event
9. Return normalized result to model loop

---

# PART II: AGENT RUNTIME

## 5. Session Runtime States

```
idle
running
waiting_permission
waiting_question
waiting_subtask
compacting
aborted
errored
```

## 6. Agent Loop (STEP-BY-STEP)

```typescript
async function promptLoop(ctx: SessionCtx): Promise<void> {
  for (;;) {
    // STEP 1: Load current state
    const state = await loadSessionState(ctx)
    
    // STEP 2: Handle pending subtask (from task tool)
    if (state.pendingSubtask) {
      await runSubtask(ctx, state.pendingSubtask)
      continue
    }
    
    // STEP 3: Handle compaction (token budget > 80%)
    if (state.needsCompaction) {
      await runCompaction(ctx)
      continue
    }
    
    // STEP 4: Check termination conditions
    if (await shouldTerminate(ctx, state)) {
      break
    }
    
    // STEP 5: Create assistant message
    const msg = await ctx.session.createAssistantMessage()
    
    // STEP 6: Build model request
    const req = await buildModelRequest(ctx, state, msg)
    
    // STEP 7: Start streaming from provider
    const stream = await ctx.provider.stream(req)
    
    // STEP 8: Process stream events
    const result = await processStream(ctx, msg, stream)
    
    // STEP 9: Check result type
    if (result.type === 'structured_output_complete') {
      await ctx.session.setStatus('idle')
      return
    }
    
    if (result.type === 'done' && result.pendingToolCalls.length === 0) {
      await ctx.session.setStatus('idle')
      return
    }
    
    // STEP 10: Loop continues with tool results as new context
  }
}
```

## 7. Termination Rules (EXPLICIT)

The loop terminates when ANY of these conditions are true:

1. **Task Complete**: No pending tool calls AND model finished naturally
2. **Structured Output**: Valid structured output produced and validated
3. **Blocked on Input**: Session status is `waiting_permission` OR `waiting_question`
4. **Permission Denied**: A permission denial makes continuation impossible
5. **Retry Exhausted**: Max retry attempts (4) reached for transient errors
6. **Doom Loop**: Same tool called 3x with identical input
7. **Compaction Required**: Context overflow AND current agent is not compaction agent
8. **Aborted**: User explicitly aborted
9. **Max Steps**: Agent.maxSteps reached

## 8. Stream Event Handling (DETERMINISTIC)

Handle these event classes in order:

1. `text-start` - Initialize text buffer
2. `text-delta` - Append text to message part
3. `text-end` - Finalize text part
4. `reasoning-start` - Initialize reasoning buffer
5. `reasoning-delta` - Append reasoning to message part
6. `reasoning-end` - Finalize reasoning part
7. `tool-call` - Create tool call part, add to pending
8. `tool-result` - Update tool call with result, remove from pending
9. `tool-error` - Update tool call with error, remove from pending
10. `step-start` - Emit step event
11. `step-finish` - Emit step event
12. `finish` - Check for structured output
13. `error` - Handle stream error

---

# PART III: TOOL SYSTEM

## 9. Tool Interface (STRICT)

```typescript
interface ToolDef<I, O> {
  name: string           // Unique identifier
  description: string    // One-line description
  permission: string     // Permission key
  input: z.ZodType<I>    // Input schema
  output: z.ZodType<O>  // Output schema
  enabled: (ctx: ToolCtx) => boolean  // Runtime filter
  execute: (ctx: ToolCtx, input: I) => Promise<O>  // Implementation
}
```

## 10. Tool Registry Assembly (ORDERED)

1. Register built-in tools from code
2. Load config-defined tools from `tool/` directories
3. Load plugin-defined tools
4. Load MCP-derived tools (for connected servers)
5. Filter merged list by: agent, permission, provider, feature flags

## 11. Built-In Tools

| Tool | Permission | Input | Output |
|------|-----------|-------|--------|
| question | question | `{ prompt: string }` | `{ answers: string[][], asked: true }` |
| bash | bash | `{ command: string, cwd?: string, timeout_ms?: number }` | `{ stdout, stderr, exit_code, duration_ms }` |
| read | read | `{ path: string, start?: number, end?: number }` | `{ path, text }` |
| glob | glob | `{ pattern: string, cwd?: string }` | `{ matches: string[] }` |
| grep | grep | `{ pattern: string, cwd?: string, limit?: number }` | `{ matches: { path, line, text }[] }` |
| edit | edit | `{ path: string, old: string, new: string, replace_all?: boolean }` | `{ path, changed: boolean }` |
| write | write | `{ path: string, text: string }` | `{ path, bytes: number }` |
| apply_patch | apply_patch | `{ patch: string }` | `{ files: string[] }` |
| task | task | `{ agent: string, task: string, context?: string, task_id?: string }` | `{ task_id, result, status }` |
| webfetch | webfetch | `{ url: string }` | `{ url, status, text }` |
| todowrite | todowrite | `{ items: { text: string, done: boolean }[] }` | `{ count: number }` |
| websearch | websearch | `{ query: string, limit?: number }` | `{ results: { title, url, snippet }[] }` |
| codesearch | codesearch | `{ query: string, limit?: number }` | `{ hits: { path, snippet, score }[] }` |
| skill | skill | `{ name: string, path?: string }` | `{ path, content }` |

## 12. Tool Execution Rules (DETERMINISTIC)

1. Validate tool exists in registry
2. Validate input against Zod schema
3. Check permission (allow/ask/deny)
4. If ask: emit event, pause, wait for user response
5. Execute with timeout (default 5 min)
6. Normalize output (JSON-safe, truncate > 100KB)
7. Persist result or error part
8. Emit completion event

---

# PART IV: MULTI-AGENT ORCHESTRATION

## 13. Agent Types

### Primary Agents
- `build`: Execute user work end-to-end (maxSteps: 50)
- `plan`: Produce implementation plans without editing (maxSteps: 30)

### Sub-Agents
- `general`: Bounded implementation task (maxSteps: 25)
- `explore`: Read-only codebase exploration (maxSteps: 20)

### Internal Agents
- `title`: Generate session title (maxSteps: 1)
- `summary`: Generate session summary (maxSteps: 1)
- `compaction`: Compress transcript (maxSteps: 1)

## 14. Task Tool (Sub-Agent Delegation)

```typescript
// Parent calls task tool
{
  agent: 'general',
  task: 'Implement user authentication',
  context: 'Use JWT, store in SQLite'
}

// Execution:
1. Create child session with parent_id
2. Inherit project, directory, reduced permissions
3. Run child's prompt loop
4. Return { task_id, result, status } to parent
5. Parent merges result into transcript
```

## 15. Delegation Rules

| Parent | Can Delegate To |
|--------|-----------------|
| build | general, explore, plan |
| plan | explore |
| general | (unless explicitly enabled) |
| explore | (never) |
| internal | (never) |

## 16. Coordinator Mode

When multiple agents need to collaborate:

1. Detect multi-agent task (analyze prompt)
2. Create coordinator session
3. Spawn child sessions for each sub-task
4. Coordinate through shared memory
5. Merge results into final response

---

# PART V: MCP SYSTEM

## 17. MCP Transports

- **stdio**: Local servers spawned by command
- **http**: Remote servers via HTTP
- **sse**: Remote servers via Server-Sent Events

## 18. MCP Server States

```
disconnected → connecting → connected
                         → offline
                         → auth_required
                         → invalid
```

## 19. MCP OAuth Flow (DETERMINISTIC)

1. Receive auth-required error from MCP server
2. Create/reuse client registration
3. Generate PKCE verifier and state token
4. Start callback server on 127.0.0.1:19876
5. Open browser to authorize URL
6. Receive callback, validate state
7. Exchange code for tokens
8. Persist tokens
9. Retry MCP connection

Timeout: 5 minutes

## 20. MCP Tool Injection

```typescript
// Convert MCP tool to local ToolDef
{
  name: `mcp__${serverName}__${toolName}`,
  description: tool.description,
  permission: 'mcp',
  input: z.object(tool.inputSchema),
  output: z.any(),
  enabled: () => server.status === 'connected',
  execute: async (ctx, input) => {
    return normalizeResult(await server.callTool(toolName, input))
  }
}
```

---

# PART VI: STATE AND SESSION

## 21. Database Schema

```sql
-- Projects
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  directory TEXT NOT NULL,
  root TEXT NOT NULL,
  git_root TEXT,
  worktree TEXT,
  name TEXT,
  initialized INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Sessions
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Messages
CREATE TABLE message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  format TEXT,
  structured_output TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Message Parts
CREATE TABLE message_part (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  type TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Sync Events
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

## 22. Session Runtime Metadata (In-Memory)

```typescript
interface SessionRuntime {
  status: SessionStatus
  stepCount: number
  pendingToolCalls: Map<string, ToolCall>
  abortController: AbortController | null
  lastMessageId: string | null
}
```

## 23. Message Part Types

```
text, file, tool, reasoning, patch, snapshot, agent, subtask, compaction, retry, step_start, step_finish, error
```

---

# PART VII: MEMORY SYSTEM (KAIROS)

## 24. Auto-Memory

- Track significant tool results
- Store in session memory
- Use for context enrichment

## 25. Memory Consolidation

Triggered when:
- Token budget > 70%
- Session pause > 10 minutes
- Explicit user request

Process:
1. Analyze recent messages
2. Extract key facts, decisions, pending work
3. Create summary with preservation rules
4. Prune old messages, keep summary

## 26. Skill Loading

```typescript
{
  name: 'skill',
  input: { name: string, path?: string },
  execute: async (ctx, input) => {
    const content = await loadSkill(input.name, input.path)
    // Inject into system prompt
    return { path: input.path || input.name, content }
  }
}
```

---

# PART VIII: EXECUTION MODEL

## 27. CLI Commands

```bash
# Start server
opencode serve

# Run prompt
opencode run "fix the bug in foo.ts"

# Session management
opencode session list
opencode session show <id>
opencode session delete <id>

# Project management
opencode project list

# MCP management
opencode mcp list
opencode mcp connect <name>
opencode mcp disconnect <name>
```

## 28. Server Routes

### Global Routes (no directory)
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /global/config` - Global config
- `GET /provider` - Provider info
- `GET /event` - SSE stream

### Instance Routes (directory-scoped)
- `GET/POST /project` - Project CRUD
- `GET/POST /session` - Session CRUD
- `POST /session/:id/prompt` - Submit prompt
- `GET /message` - Message queries
- `GET/POST /permission` - Permission requests
- `GET/POST /question` - Question requests
- `GET/POST /mcp` - MCP management
- `GET/POST /pty` - Terminal sessions

---

# PART IX: RELIABILITY

## 29. Retry Logic (DETERMINISTIC)

Retry ONLY for transient errors:
- Network interruption
- 429 (rate limit)
- 503 (unavailable)
- Timeout

Retry schedule:
- Attempt 1: immediate
- Attempt 2: 500ms
- Attempt 3: 1s
- Attempt 4: 2s

Stop after 4 attempts.

## 30. Failure Handling Matrix

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Tool throws | Exception | Persist error part, continue |
| Permission deny | Rule = deny | Persist error, stop action |
| Permission ask | Rule = ask | Emit event, pause session |
| Doom loop | 3x identical tool call | Stop, require user input |
| Context overflow | Budget > 80% OR 431 error | Run compaction |
| MCP offline | Transport failure | Mark offline, remove tools |
| MCP auth | 401 response | Trigger OAuth flow |
| Child fail | Child error | Return failed result to parent |
| Server restart | In-memory lost | Mark sessions interrupted |

## 31. SSE Reconnect (DETERMINISTIC)

```typescript
function connectStream(store) {
  let timer
  const open = () => {
    const es = new EventSource("/event")
    const beat = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        es.close()
        setTimeout(open, 2000)
      }, 25000)
    }
    es.onmessage = (evt) => { beat(); store.apply(JSON.parse(evt.data)) }
    es.onerror = () => { es.close(); setTimeout(open, 2000) }
    beat()
  }
  open()
}
```

---

# PART X: HIDDEN FEATURES

## 32. KAIROS (Memory System)

- Automatic fact extraction from tool results
- Session-level memory with consolidation
- Used for context enrichment in prompts

## 33. ULTRAPLAN (Planning)

- Advanced planning for complex tasks
- Dependency graph analysis
- Risk identification

## 34. Coordinator Mode

- Multi-agent task orchestration
- Parent-child coordination
- Result merging

## 35. Remote Control / Bridge

```typescript
class BridgeClient {
  async pollForWork(): Promise<WorkItem | null>
  async acknowledgeWork(workId: string): Promise<void>
  spawnSession(work: WorkItem): ChildProcess
}
```

---

# PART XI: DEPLOYMENT

## 36. Local Development

```bash
# Start API server
bun run --cwd packages/opencode src/index.ts serve

# Start web client
bun run --cwd packages/app dev
```

## 37. Production Build

```bash
bun run build
bun run typecheck
bun run test
```

## 38. Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
COPY packages/opencode ./packages/opencode
COPY packages/app ./packages/app
RUN bun install --frozen-lockfile
RUN bun run build
EXPOSE 4096 5173
CMD ["bun", "run", "packages/opencode/dist/index.js", "serve"]
```

---

# PART XII: BOOTSTRAP

## 39. Project Initialization

```bash
mkdir my-agent-platform
cd my-agent-platform
bun init -y
bun add -d turbo typescript @types/bun vite vitest playwright eslint prettier
```

## 40. Package Structure

```
packages/
├── opencode/       # Core runtime
├── app/            # Web client
├── sdk/js/         # TypeScript SDK
├── ui/             # Shared UI
├── util/           # Utilities
├── desktop/        # Tauri wrapper
├── desktop-electron/  # Electron wrapper
└── web/            # Marketing site

sdks/
└── vscode/         # VS Code extension

github/             # GitHub automation
```

## 41. Dependencies

```bash
# Core
bun add hono zod ai @ai-sdk/openai @ai-sdk/anthropic @modelcontextprotocol/sdk
bun add eventemitter3 remeda ulid ws yargs effect

# Client
bun add solid-js @tanstack/solid-query @solidjs/router
bun add -d vite vite-plugin-solid
```

---

# COMPLETION CRITERIA

The system is complete when ALL of these are true:

1. New repository can be created from bootstrap alone
2. Server starts locally and answers all routes
3. Client creates session, submits prompt, streams parts
4. Child session created through task tool and merged
5. MCP servers registered, authenticated, exposed as tools
6. System survives all failure scenarios
7. All tests pass

---

This specification is COMPLETE and DETERMINISTIC. Use it to rebuild the entire Claude Code system from scratch.