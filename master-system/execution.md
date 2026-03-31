# EXECUTION MODEL SPECIFICATION

This document defines the complete execution model for the agent platform.

---

## 1. CLI COMMANDS

### Main Commands

```bash
# Start the local server
opencode serve

# Run a prompt in current directory
opencode run "fix the bug in foo.ts"

# Session management
opencode session list
opencode session show <id>
opencode session delete <id>
opencode session continue <id>

# Project management
opencode project list
opencode project current
opencode project discover <path>

# MCP management
opencode mcp list
opencode mcp connect <name>
opencode mcp disconnect <name>
opencode mcp add <name> --stdio --command "npx @some/server"

# Configuration
opencode config get
opencode config set <key> <value>
```

---

## 2. CLI IMPLEMENTATION

```typescript
import { parseArgs } from 'util'

const commands = {
  serve: async () => {
    const { serve } = await import('./server/server.js')
    await serve()
  },
  
  run: async (args: string[]) => {
    const prompt = args.join(' ')
    const session = await createSession()
    await session.run(prompt)
  },
  
  session: async (args: string[]) => {
    const [subcommand, ...rest] = args
    switch (subcommand) {
      case 'list': return listSessions()
      case 'show': return showSession(rest[0])
      case 'delete': return deleteSession(rest[0])
      case 'continue': return continueSession(rest[0])
    }
  },
  
  project: async (args: string[]) => {
    const [subcommand, ...rest] = args
    switch (subcommand) {
      case 'list': return listProjects()
      case 'current': return getCurrentProject()
      case 'discover': return discoverProject(rest[0])
    }
  },
  
  mcp: async (args: string[]) => {
    const [subcommand, ...rest] = args
    switch (subcommand) {
      case 'list': return listMcpServers()
      case 'connect': return connectMcp(rest[0])
      case 'disconnect': return disconnectMcp(rest[0])
    }
  }
}

export async function main() {
  const { positionals } = parseArgs({ args: process.argv.slice(2) })
  const [command, ...subcommand] = positionals
  
  await commands[command]?.(subcommand) || printHelp()
}
```

---

## 3. SERVER ROUTES

### Global Routes (No Directory Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| GET | `/global/config` | Global configuration |
| GET | `/provider` | Provider information |
| GET | `/event` | SSE stream |

### Instance Routes (Directory-Scoped)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/project` | Project CRUD |
| GET/POST | `/session` | Session CRUD |
| POST | `/session/:id/prompt` | Submit prompt |
| GET | `/session/:id/status` | Session status |
| GET | `/message` | Message queries |
| GET/POST | `/permission` | Permission requests |
| POST | `/permission/:id/reply` | Permission response |
| GET/POST | `/question` | Question requests |
| POST | `/question/:id/reply` | Question response |
| GET/POST | `/mcp` | MCP server management |
| POST | `/pty` | Create PTY session |
| GET | `/pty/:id/connect` | WebSocket connect |
| PUT | `/pty/:id` | Resize PTY |

---

## 4. SDK CLIENT

### Generated TypeScript SDK

```typescript
import { Client } from '@my-agent/sdk'

// Global client (no directory)
const globalClient = new Client({
  baseUrl: 'http://127.0.0.1:4096'
})

// Directory-scoped client
const projectClient = new Client({
  baseUrl: 'http://127.0.0.1:4096',
  directory: '/path/to/project'
})

// Create session
const session = await projectClient.session.create({
  agent: 'build'
})

// Submit prompt
const stream = await projectClient.session.prompt(session.id, {
  text: 'Fix the bug in foo.ts'
})

// Process stream
for await (const event of stream) {
  console.log(event)
}

// SSE for real-time updates
const events = new EventSource('http://127.0.0.1:4096/event', {
  headers: { 'x-opencode-directory': '/path/to/project' }
})
```

---

## 5. REMOTE CONTROL / BRIDGE

### Bridge Client

```typescript
class BridgeClient {
  private ws: WebSocket
  private queue: WorkItem[] = []
  
  async pollForWork(): Promise<WorkItem | null> {
    const response = await this.api.poll()
    return response.work || null
  }
  
  async acknowledgeWork(workId: string): Promise<void> {
    await this.api.ack(workId)
  }
  
  spawnSession(work: WorkItem): ChildProcess {
    return spawn('opencode', [
      '--continue',
      '--session-id', work.sessionId,
      '--directory', work.directory
    ])
  }
}
```

---

This execution model specification is COMPLETE and DETERMINISTIC.