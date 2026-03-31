# MCP Subsystem Architecture

## Overview

The MCP (Model Context Protocol) subsystem provides first-class integration with external tools and services through the MCP standard. It supports:
- Local stdio servers
- Remote HTTP/SSE servers
- OAuth authentication
- Dynamic tool injection
- Prompt and resource access

## MCP Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP SUBSYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Config     │───▶│   Client     │───▶│   Registry   │  │
│  │   (JSON)     │    │              │    │   (Tools)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │         │
│         │                    │                    │         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Auth       │    │   Transport   │    │    Events    │  │
│  │   Manager    │    │   Layer       │    │    Emitter   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Server Configuration

```typescript
interface McpServerConfig {
  name: string                    // Unique server name
  transport: 'stdio' | 'http' | 'sse'
  
  // For stdio servers
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  
  // For remote servers
  url?: string
  headers?: Record<string, string>
  
  // Settings
  enabled: boolean
  
  // Authentication
  auth?: {
    type: 'none' | 'oauth'
  }
}

interface McpServerState {
  name: string
  transport: 'stdio' | 'http' | 'sse'
  status: McpServerStatus
  url?: string
  command?: string
  tools: string[]
  prompts: string[]
  resources: string[]
  error?: string
}

type McpServerStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'offline'
  | 'auth_required'
  | 'invalid'
```

## Transport Types

### Stdio Transport

```typescript
class StdioTransport {
  private process: ChildProcess | null = null
  
  async connect(config: McpServerConfig): Promise<void> {
    this.process = spawn(config.command!, config.args!, {
      env: { ...process.env, ...config.env },
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    
    // Initialize MCP protocol
    await this.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'opencode', version: '0.1.0' },
      },
    })
    
    // List tools
    const toolsResult = await this.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    })
  }
  
  async callTool(name: string, args: unknown): Promise<unknown> {
    const result = await this.send({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    })
    return result.content
  }
  
  private send(message: McpMessage): Promise<McpResponse> {
    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n'
      this.process!.stdin!.write(messageStr)
      
      const handler = (data: Buffer) => {
        const response = JSON.parse(data.toString())
        if (response.id === message.id) {
          resolve(response)
        }
      }
      
      this.process!.stdout!.on('data', handler)
      
      setTimeout(() => reject(new Error('Timeout')), 30000)
    })
  }
  
  async close(): Promise<void> {
    this.process?.kill()
    this.process = null
  }
}
```

### HTTP/SSE Transport

```typescript
class HttpTransport {
  private baseUrl: string
  private headers: Record<string, string>
  private eventSource: EventSource | null = null
  
  async connect(config: McpServerConfig): Promise<void> {
    this.baseUrl = config.url!
    this.headers = config.headers || {}
    
    // Initialize via HTTP POST
    const initResponse = await fetch(`${this.baseUrl}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'opencode', version: '0.1.0' },
      }),
    })
    
    // Set up SSE for notifications
    this.eventSource = new EventSource(`${this.baseUrl}/notifications`, {
      headers: this.headers,
    })
    
    this.eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      this.handleNotification(notification)
    }
  }
  
  async callTool(name: string, args: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({ name, arguments: args }),
    })
    
    const result = await response.json()
    return result.content
  }
  
  private handleNotification(notification: McpNotification): void {
    if (notification.method === 'tools/list_changed') {
      // Emit event for tool list refresh
      this.emit('toolsChanged')
    }
  }
  
  async close(): Promise<void> {
    this.eventSource?.close()
  }
}
```

## Dynamic Tool Injection

```typescript
class McpToolRegistry {
  private servers = new Map<string, McpServerState>()
  private connections = new Map<string, Transport>()
  
  async registerServer(config: McpServerConfig): Promise<void> {
    const transport = config.transport === 'stdio'
      ? new StdioTransport()
      : new HttpTransport()
    
    await transport.connect(config)
    
    // Get tools, prompts, resources
    const [tools, prompts, resources] = await Promise.all([
      transport.listTools(),
      transport.listPrompts(),
      transport.listResources(),
    ])
    
    // Store server state
    this.servers.set(config.name, {
      name: config.name,
      transport: config.transport,
      status: 'connected',
      url: config.url,
      command: config.command,
      tools: tools.map(t => t.name),
      prompts: prompts.map(p => p.name),
      resources: resources.map(r => r.uri),
    })
    
    this.connections.set(config.name, transport)
  }
  
  // Convert MCP tools to local ToolDef format
  getTools(): ToolDef<any, any>[] {
    const tools: ToolDef<any, any>[] = []
    
    for (const [serverName, state] of this.servers) {
      if (state.status !== 'connected') continue
      
      const connection = this.connections.get(serverName)!
      
      for (const tool of state.tools) {
        tools.push(this.wrapMcpTool(serverName, tool, connection))
      }
    }
    
    return tools
  }
  
  private wrapMcpTool(
    serverName: string,
    tool: McpTool,
    connection: Transport
  ): ToolDef<any, any> {
    const prefixedName = `mcp__${serverName}__${tool.name}`
    
    return {
      name: prefixedName,
      description: tool.description,
      permission: 'mcp',
      input: z.object(tool.inputSchema),
      output: z.any(),
      enabled: () => {
        const state = this.servers.get(serverName)
        return state?.status === 'connected'
      },
      execute: async (ctx, input) => {
        const result = await connection.callTool(tool.name, input)
        return this.normalizeResult(result)
      },
    }
  }
  
  private normalizeResult(result: unknown): unknown {
    // Handle MCP content blocks
    if (Array.isArray(result)) {
      return result.map(block => {
        if (block.type === 'text') return block.text
        if (block.type === 'resource') return block.uri
        return block
      })
    }
    return result
  }
  
  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name)
    await connection?.close()
    
    this.connections.delete(name)
    
    const state = this.servers.get(name)
    if (state) {
      state.status = 'disconnected'
      state.tools = []
      state.prompts = []
      state.resources = []
    }
  }
  
  getServerState(name: string): McpServerState | undefined {
    return this.servers.get(name)
  }
}
```

## Events Emitted

```typescript
// MCP-related sync events
type McpEvent =
  | { type: 'mcp.server.updated'; server: string; state: McpServerState }
  | { type: 'mcp.tools.changed'; server: string }
  | { type: 'mcp.auth.required'; server: string }
  | { type: 'mcp.connected'; server: string }
  | { type: 'mcp.disconnected'; server: string }
  | { type: 'mcp.error'; server: string; error: string }
```

## Failure Handling

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Server offline | Connect/call timeout | Mark offline, remove tools |
| Auth required | 401 response | Trigger OAuth flow |
| Invalid schema | Validation error | Mark invalid, don't register tools |
| Connection lost | SSE/stream error | Reconnect, refresh tools |
| Tool not found | Call returns error | Return error to model |
