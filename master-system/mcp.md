# MCP SYSTEM SPECIFICATION

This document defines the MCP (Model Context Protocol) subsystem for the agent platform.

---

## 1. SUPPORTED TRANSPORTS

- **stdio**: Local servers spawned by command
- **http**: Remote servers via HTTP POST
- **sse**: Remote servers via Server-Sent Events

---

## 2. MCP CONFIG MODEL

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

---

## 3. STATE TRANSITIONS

```
disconnected → connecting → connected
                         → offline
                         → auth_required
                         → invalid

connected → disconnected (on disconnect)
          → offline (on transport failure)
          → auth_required (on 401)
          → invalid (on schema error)
```

---

## 4. RUNTIME RESPONSIBILITIES

1. Connect and disconnect servers on demand
2. List tools, prompts, and resources
3. Convert remote tools into dynamic registry entries
4. Expose prompt retrieval and resource reads to session layer
5. Refresh tool definitions when server emits tool-list-changed
6. Publish `mcp.tools.changed` when active tool set changes

---

## 5. OAUTH FLOW (DETERMINISTIC)

```
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
```

---

## 6. STDIO TRANSPORT

```typescript
class StdioTransport {
  private process: ChildProcess | null = null
  
  async connect(config: McpServerConfig): Promise<void> {
    this.process = spawn(config.command!, config.args!, {
      env: { ...process.env, ...config.env },
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    // Initialize MCP protocol
    await this.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'opencode', version: '0.1.0' }
      }
    })
    
    // List tools
    const toolsResult = await this.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    })
  }
  
  async callTool(name: string, args: unknown): Promise<unknown> {
    const result = await this.send({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args }
    })
    return result.content
  }
  
  private send(message: McpMessage): Promise<McpResponse> {
    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n'
      this.process!.stdin!.write(messageStr)
      
      const handler = (data: Buffer) => {
        const response = JSON.parse(data.toString())
        if (response.id === message.id) resolve(response)
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

---

## 7. HTTP/SSE TRANSPORT

```typescript
class HttpTransport {
  private baseUrl: string
  private headers: Record<string, string>
  private eventSource: EventSource | null = null
  
  async connect(config: McpServerConfig): Promise<void> {
    this.baseUrl = config.url!
    this.headers = config.headers || {}
    
    // Initialize via HTTP POST
    await fetch(`${this.baseUrl}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify({
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'opencode', version: '0.1.0' }
      })
    })
    
    // Set up SSE for notifications
    this.eventSource = new EventSource(`${this.baseUrl}/notifications`, {
      headers: this.headers
    })
    
    this.eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      this.handleNotification(notification)
    }
  }
  
  async callTool(name: string, args: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify({ name, arguments: args })
    })
    const result = await response.json()
    return result.content
  }
  
  private handleNotification(notification: McpNotification): void {
    if (notification.method === 'tools/list_changed') {
      this.emit('toolsChanged')
    }
  }
  
  async close(): Promise<void> {
    this.eventSource?.close()
  }
}
```

---

## 8. DYNAMIC TOOL INJECTION

```typescript
function wrapMcpTool(server: McpServerState, tool: McpTool): ToolDef<any, any> {
  const prefixedName = `mcp__${server.name}__${tool.name}`
  
  return {
    name: prefixedName,
    description: tool.description,
    permission: 'mcp',
    input: z.object(tool.inputSchema),
    output: z.any(),
    enabled: () => server.status === 'connected',
    execute: async (ctx, input) => {
      const result = await server.client.callTool(tool.name, input)
      return normalizeMcpResult(result)
    }
  }
}
```

---

## 9. FAILURE HANDLING

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Server offline | Connect/call timeout | Mark offline, remove tools |
| Auth required | 401 response | Trigger OAuth flow |
| Invalid schema | Validation error | Mark invalid, don't register |
| Connection lost | SSE/stream error | Reconnect, refresh tools |
| Tool not found | Call returns error | Return error to model |

---

This MCP system specification is COMPLETE and DETERMINISTIC.