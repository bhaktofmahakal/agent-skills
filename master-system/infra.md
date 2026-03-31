# INFRASTRUCTURE SPECIFICATION

This document defines the infrastructure for the agent platform.

---

## 1. SERVER IMPLEMENTATION

### Hono Server Setup

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { serve } from '@hono/node-server'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', compress())
app.use('*', logger())

// Routes
app.get('/health', (c) => c.json({ healthy: true }))
app.get('/ready', (c) => c.json({ ready: true }))
app.route('/', router)

serve({
  fetch: app.fetch,
  port: 4096,
  hostname: '127.0.0.1'
})
```

---

## 2. INSTANCE MANAGEMENT

```typescript
const instances = new Map<string, ProjectInstance>()

export function createInstance(directory: string): ProjectInstance {
  const instance: ProjectInstance = {
    directory,
    storage: new Database(getDbPath(directory)),
    sync: new SyncPublisher(db, projectId),
    project: new ProjectService(db),
    session: new SessionService(db),
    tool: new ToolRegistry(),
    agent: new AgentService(),
    permission: new PermissionEngine(db),
    mcp: new McpClient(),
    plugin: new PluginManager(),
    provider: new ProviderManager(),
    question: new QuestionService(),
    pty: new PtyService(),
    memory: new MemoryService(),
    coordinator: new CoordinatorService()
  }
  
  instances.set(directory, instance)
  return instance
}

export function getInstance(directory: string): ProjectInstance | undefined {
  return instances.get(directory)
}
```

---

## 3. ENVIRONMENT VARIABLES

```dotenv
# Server
OPENCODE_HOST=127.0.0.1
OPENCODE_PORT=4096
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_WEB_URL=http://127.0.0.1:5173

# Directories
OPENCODE_DATA_DIR=.data
OPENCODE_CONFIG_DIR=.config

# MCP
OPENCODE_DISABLE_MDNS=0
OPENCODE_MCP_CALLBACK_PORT=19876

# API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
OPENCODE_EXA_API_KEY=
OPENCODE_GITHUB_TOKEN=
```

---

## 4. DIRECTORY STRUCTURE

```
packages/
├── opencode/
│   └── src/
│       ├── index.ts           # CLI entry point
│       ├── server/
│       │   ├── server.ts     # Hono server
│       │   ├── router.ts      # Route assembly
│       │   ├── instance.ts    # Instance management
│       │   └── routes/        # API routes
│       ├── project/           # Project service
│       ├── session/           # Session service
│       ├── tool/              # Tool registry
│       ├── agent/             # Agent definitions
│       ├── permission/        # Permission engine
│       ├── mcp/               # MCP client
│       ├── plugin/            # Plugin manager
│       ├── provider/          # Provider adapters
│       ├── question/          # Question service
│       ├── pty/               # PTY service
│       ├── memory/            # Memory service
│       ├── coordinator/        # Coordinator service
│       ├── storage/           # Database
│       └── sync/              # Event publisher
├── app/                       # Web client
├── sdk/js/                    # TypeScript SDK
├── ui/                        # Shared UI
├── util/                      # Utilities
├── desktop/                   # Tauri
├── desktop-electron/          # Electron
└── web/                       # Marketing site
```

---

## 5. CONFIGURATION

### Project Config (.opencode/config.json)

```json
{
  "instructions": ["CLAUDE.md", "AGENTS.md"],
  "mcp": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "."],
      "enabled": true
    }
  ],
  "permission": {
    "bash": "ask",
    "edit": "ask"
  },
  "enabled_providers": ["anthropic", "openai"],
  "disabled_tools": ["websearch"]
}
```

---

This infrastructure specification is COMPLETE and DETERMINISTIC.