# Module Boundaries

## Core Principles

Each module in the system has clearly defined responsibilities and interfaces. Modules communicate through well-defined contracts, not shared state.

## Module Boundaries

### 1. Server Layer → Instance Layer

**Server Routes** delegate to **Instance Services**

```
Server Route Handler
    ↓
Validates request (Zod)
    ↓
Gets instance from router
    ↓
Calls instance service method
    ↓
Returns service result
```

**Contract:**
- Server never directly accesses storage
- All data access goes through instance services
- Services return domain objects, not raw DB rows

### 2. Instance Services → Storage

**Services** query/modify data through **Storage Layer**

```
Service Method
    ↓
Open transaction (if mutation)
    ↓
Call storage query methods
    ↓
Commit transaction (if mutation)
    ↓
Return domain objects
```

**Contract:**
- Storage layer knows SQL, nothing about domain logic
- Services pass domain objects to storage
- Storage returns domain objects from queries

### 3. Session Service → Tool Registry

**Session Loop** executes tools through **Tool Registry**

```
Model calls tool
    ↓
SessionService.checkPermission(toolName, input)
    ↓
ToolRegistry.get(toolName)
    ↓
Tool.execute(input, context)
    ↓
Normalize result
    ↓
Return to session loop
```

**Contract:**
- Registry validates tool exists and input schema
- Registry checks enable/disable status
- Service executes, registry does not

### 4. Session Service → Agent Manager

**Session Loop** gets agent config from **Agent Manager**

```
User prompt received
    ↓
SessionService.resolveAgent(requestedAgent)
    ↓
AgentManager.get(agentName)
    ↓
Return agent definition with tools, permissions, prompt
    ↓
Build model request with agent config
```

**Contract:**
- Manager loads built-in + config agents
- Manager applies overlays
- Service gets read-only agent config

### 5. Session Service → MCP Client

**Session Loop** gets tools from **MCP Client**

```
Tool registry building
    ↓
Get built-in tools
    ↓
For each connected MCP server:
  McpClient.getTools(serverName)
    ↓
Wrap MCP tools as ToolDef
    ↓
Merge into registry
```

**Contract:**
- Client manages connections
- Client converts MCP tools to local format
- Registry filters by permission before exposing

### 6. Permission Engine → Session Service

**Permission Engine** evaluates rules, **Session Service** handles results

```
Tool execution requested
    ↓
PermissionEngine.check(toolName, input, context)
    ↓
Returns: allow | ask | deny
    ↓
SessionService.handlePermissionResult(action, request)
    ↓
Execute, pause, or error
```

**Contract:**
- Engine evaluates rules only
- Engine returns action, not executes
- Service decides how to handle each action

### 7. Sync System → All Services

**Services** emit events, **Sync System** broadcasts

```
Service completes operation
    ↓
db.transaction(() => {
  // Write data
  // Write sync_event
})
    ↓
SyncSystem.emit(event)
    ↓
SSE broadcasts to clients
```

**Contract:**
- Events written in same transaction as data
- Event payload is JSON-serializable
- Sync system doesn't know about domain

### 8. Client SDK → Server Routes

**Client** calls routes, **Server** returns data

```
SDK method call
    ↓
HTTP request to server route
    ↓
Server validates, executes, returns
    ↓
SDK parses response
    ↓
Returns typed result to caller
```

**Contract:**
- SDK types mirror server route contracts
- SDK handles authentication
- SDK handles retry logic

## Dependency Direction

```
┌─────────────────────────────────────────────┐
│               Client Surfaces               │
│  (Web, Desktop, SDK, VS Code, GitHub)       │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST/SSE
┌────────────────────▼────────────────────────┐
│            Control Plane Server            │
│         (Global routes, routing)             │
└────────────────────┬────────────────────────┘
                     │ Instance lookup
┌────────────────────▼────────────────────────┐
│              Instance Router               │
│      (Directory resolution, scoped)        │
└────────────────────┬────────────────────────┘
                     │ Service calls
┌────────────────────▼────────────────────────┐
│           Runtime Services                 │
│  (Session, Tool, Agent, Permission, MCP)    │
└─────────┬──────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────┐
│          Storage + Sync                    │
│     (SQLite, Event publishing)              │
└─────────────────────────────────────────────┘
```

## What Each Module Owns

| Module | Owns | Exposes |
|--------|------|---------|
| Server | HTTP handling, routing | Route handlers |
| Instance | Project-scoped state | Service interfaces |
| Session | Message/stream processing | Prompt loop, message CRUD |
| Tool Registry | Tool execution | get(), execute(), filter() |
| Agent Manager | Agent definitions | get(), list() |
| Permission | Rule evaluation | check(), getRules() |
| MCP Client | MCP connections | connect(), callTool(), getTools() |
| Storage | SQLite operations | query(), insert(), update(), transaction() |
| Sync | Event publishing | emit(), subscribe() |
