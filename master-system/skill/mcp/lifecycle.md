# MCP Connection Lifecycle

## Overview

MCP server connections follow a defined lifecycle from configuration through disconnection. Each phase has specific behaviors and failure handling.

## Lifecycle States

```
┌─────────────────────────────────────────────────────────────┐
│                  MCP SERVER LIFECYCLE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ config.json│ ← User configures servers                  │
│  └──────┬──────┘                                            │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │disconnected │ ← Initial state                           │
│  └──────┬──────┘                                            │
│         │                                                   │
│         ▼ connect()                                         │
│  ┌─────────────┐                                            │
│  │ connecting  │ ← Handshake in progress                    │
│  └──────┬──────┘                                            │
│         │                                                   │
│    ┌────┴────┐                                              │
│    │         │                                              │
│    ▼         ▼                                              │
│ ┌──────┐  ┌────────────┐                                    │
│ │error │  │ connected  │ ← Tools/prompts/resources loaded   │
│ └──────┘  └──────┬─────┘                                    │
│      │          │                                           │
│      │          │ disconnect()                             │
│      │          ▼                                           │
│      │     ┌────────────┐                                    │
│      └────▶│disconnected│                                   │
│             └────────────┘                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Connection Flow

### 1. Load Configuration

```typescript
async function loadMcpConfig(ctx: ProjectInstance): Promise<McpServerConfig[]> {
  // Load from user config file
  const configPath = path.join(ctx.configDir, 'mcp-servers.json')
  
  if (!fs.existsSync(configPath)) {
    return []
  }
  
  const configData = fs.readFileSync(configPath, 'utf-8')
  const config = JSON.parse(configData)
  
  return config.servers || []
}
```

### 2. Initialize Connections

```typescript
async function initializeMcpServers(
  ctx: ProjectInstance,
  configs: McpServerConfig[]
): Promise<void> {
  for (const config of configs) {
    if (!config.enabled) continue
    
    try {
      await connectMcpServer(ctx, config)
    } catch (error) {
      console.error(`Failed to connect MCP server ${config.name}:`, error)
    }
  }
}
```

### 3. Connect to Server

```typescript
async function connectMcpServer(
  ctx: ProjectInstance,
  config: McpServerConfig
): Promise<void> {
  // Get or create client for this project
  const client = ctx.mcp.getOrCreate(config.name)
  
  // Update state to connecting
  client.updateState({ status: 'connecting' })
  
  // Emit event
  ctx.sync.emit({
    type: 'mcp.server.updated',
    server: config.name,
    state: { name: config.name, status: 'connecting' },
  })
  
  try {
    // Create transport based on type
    const transport = config.transport === 'stdio'
      ? new StdioTransport(config)
      : new HttpTransport(config)
    
    // Connect
    await transport.connect()
    
    // Initialize MCP session
    const initResult = await transport.initialize()
    
    // Store connection
    client.setConnection(transport)
    
    // List available resources
    const [tools, prompts, resources] = await Promise.all([
      transport.listTools(),
      transport.listPrompts(),
      transport.listResources(),
    ])
    
    // Update state to connected
    client.updateState({
      status: 'connected',
      tools: tools.map(t => t.name),
      prompts: prompts.map(p => p.name),
      resources: resources.map(r => r.uri),
    })
    
    // Emit connected event
    ctx.sync.emit({
      type: 'mcp.connected',
      server: config.name,
    })
    
    // Register tools
    ctx.tool.registerMcpTools(config.name, tools)
    
  } catch (error) {
    if (error.code === 'AUTH_REQUIRED') {
      client.updateState({
        status: 'auth_required',
        error: error.message,
      })
      
      ctx.sync.emit({
        type: 'mcp.auth.required',
        server: config.name,
      })
      
      // Start OAuth flow
      await startOAuthFlow(ctx, config)
    } else {
      client.updateState({
        status: 'offline',
        error: error.message,
      })
      
      ctx.sync.emit({
        type: 'mcp.error',
        server: config.name,
        error: error.message,
      })
    }
  }
}
```

### 4. Handle Tool List Changes

```typescript
// MCP servers can notify of tool changes via SSE
async function handleToolsChanged(
  ctx: ProjectInstance,
  serverName: string
): Promise<void> {
  const client = ctx.mcp.get(serverName)
  const transport = client.getConnection()
  
  if (!transport) return
  
  // Refresh tool list
  const tools = await transport.listTools()
  
  // Update state
  client.updateState({
    tools: tools.map(t => t.name),
  })
  
  // Unregister old tools, register new ones
  ctx.tool.unregisterMcpTools(serverName)
  ctx.tool.registerMcpTools(serverName, tools)
  
  // Emit event
  ctx.sync.emit({
    type: 'mcp.tools.changed',
    server: serverName,
  })
}
```

### 5. Disconnect

```typescript
async function disconnectMcpServer(
  ctx: ProjectInstance,
  serverName: string
): Promise<void> {
  const client = ctx.mcp.get(serverName)
  
  if (!client) return
  
  // Close transport
  const transport = client.getConnection()
  await transport?.close()
  
  // Unregister tools
  ctx.tool.unregisterMcpTools(serverName)
  
  // Update state
  client.updateState({
    status: 'disconnected',
    tools: [],
    prompts: [],
    resources: [],
  })
  
  // Emit event
  ctx.sync.emit({
    type: 'mcp.disconnected',
    server: serverName,
  })
}
```

### 6. Reconnection Logic

```typescript
async function withReconnect<T>(
  ctx: ProjectInstance,
  serverName: string,
  operation: () => Promise<T>
): Promise<T> {
  const maxRetries = 3
  const baseDelay = 1000
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (isRetryableError(error) && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await sleep(delay)
        
        // Try to reconnect
        const config = ctx.mcp.getConfig(serverName)
        await connectMcpServer(ctx, config)
      } else {
        throw error
      }
    }
  }
}

function isRetryableError(error: Error): boolean {
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.status === 503
  )
}
```

## Server State Transitions

```
disconnected → connecting
  ↓ (success)
connected
  ↓ (disconnect)
disconnected

connecting → connected
  ↓ (error with auth required)
auth_required

connecting → offline (transient error)
  ↓ (reconnect)
connecting → connected
```

## Events by State

| State | Events Emitted |
|-------|----------------|
| connecting | mcp.server.updated |
| connected | mcp.connected, mcp.server.updated |
| auth_required | mcp.auth.required, mcp.server.updated |
| offline | mcp.error, mcp.server.updated |
| disconnected | mcp.disconnected, mcp.server.updated |

## Auto-Reconnect

Servers automatically reconnect on certain conditions:

```typescript
// Reconnect triggers
const RECONNECT_TRIGGERS = [
  'server restart detected',
  'connection dropped',
  'heartbeat failed',
]

// Reconnect schedule
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]
```
