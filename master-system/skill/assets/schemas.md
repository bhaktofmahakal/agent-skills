# Canonical Schemas

## Project

```typescript
interface Project {
  id: string
  directory: string
  root: string
  gitRoot: string | null
  worktree: string
  sandboxes: string[]
  name: string
  icon: string | null
  initialized: boolean
  createdAt: number
  updatedAt: number
}
```

## Workspace

```typescript
interface Workspace {
  id: string
  projectId: string
  name: string
  directory: string
  branch: string | null
  remote: string | null
  createdAt: number
}
```

## Session

```typescript
type SessionStatus = 
  | 'idle'
  | 'running'
  | 'waiting_permission'
  | 'waiting_question'
  | 'waiting_subtask'
  | 'compacting'
  | 'aborted'
  | 'errored'

type PermissionMode = 'default' | 'accept_edits' | 'accept_all'

interface Session {
  id: string
  projectId: string
  workspaceId: string | null
  directory: string
  parentId: string | null
  title: string | null
  summary: string | null
  agent: string
  model: string | null
  status: SessionStatus
  permissionMode: PermissionMode
  revertState: string | null
  shareToken: string | null
  archived: boolean
  createdAt: number
  updatedAt: number
}
```

## Message and Parts

```typescript
type MessageRole = 'user' | 'assistant' | 'tool' | 'system'

interface Message {
  id: string
  sessionId: string
  role: MessageRole
  format: string | null
  structuredOutput: unknown | null
  errorCode: string | null
  createdAt: number
  updatedAt: number
}

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'file'; path: string; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool'; name: string; state: 'running' | 'completed' | 'errored'; input: unknown; output?: unknown; error?: string }
  | { type: 'patch'; path: string; diff: string }
  | { type: 'snapshot'; value: unknown }
  | { type: 'agent'; name: string }
  | { type: 'subtask'; agent: string; task?: string; taskId?: string; prompt: string }
  | { type: 'compaction'; summary: string }
  | { type: 'retry'; attempt: number; error: string }
  | { type: 'step_start'; step: number }
  | { type: 'step_finish'; step: number }
  | { type: 'error'; code: string; message: string }
```

## Permission Rule

```typescript
type PermissionAction = 'allow' | 'ask' | 'deny'

interface PermissionRule {
  permission: string
  pattern: string
  action: PermissionAction
}

interface PermissionRequest {
  id: string
  sessionId: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
  tool?: { messageId: string; callId: string }
}
```

## Question Request

```typescript
interface QuestionOption {
  label: string
  description: string
}

interface QuestionInfo {
  question: string
  header: string
  options: QuestionOption[]
  multiple?: boolean
  custom?: boolean
}

interface QuestionRequest {
  id: string
  sessionId: string
  questions: QuestionInfo[]
  tool?: { messageId: string; callId: string }
}
```

## Command and Agent

```typescript
interface CommandInfo {
  name: string
  description: string
  template: string
  agent?: string
  model?: string
  subtask?: boolean
}

interface AgentDefinition {
  name: string
  description: string
  mode: 'primary' | 'subagent' | 'internal'
  model?: { providerID: string; modelID: string }
  maxSteps: number
  hidden?: boolean
}

interface SkillInfo {
  name: string
  description: string
  path: string
}
```

## Config

```typescript
interface Config {
  instructions?: string[]
  plugin?: Array<{ spec: string; options?: Record<string, unknown> }>
  mcp?: McpServerConfig[]
  permission?: Record<string, string | Record<string, PermissionAction>>
  enabledProviders?: string[]
  disabledProviders?: string[]
  disabledTools?: string[]
  experimental?: Record<string, unknown>
}
```

## Path and VCS

```typescript
interface PathInfo {
  home: string
  state: string
  config: string
  worktree: string
  directory: string
}

interface VcsInfo {
  branch: string | null
}

interface SessionStatus {
  type: SessionStatus
}

interface TodoItem {
  id: string
  text: string
  done: boolean
}
```

## Provider and MCP

```typescript
interface ProviderInfo {
  id: string
  name: string
  models: Record<string, { id: string; name: string; contextWindow?: number }>
}

interface ProviderListResponse {
  all: ProviderInfo[]
  default: Record<string, string>
  connected: string[]
}

interface ProviderAuthResponse {
  [provider: string]: Array<{
    type: string
    name: string
    inputs?: Record<string, string>
  }>
}

type McpServerStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'offline'
  | 'auth_required'
  | 'invalid'

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
```

## PTY

```typescript
interface PtyInfo {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  status: 'running' | 'exited'
  pid: number
}
```

## MCP Server Config

```typescript
interface McpServerConfig {
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
```

## Sync Event

```typescript
interface SyncEvent<T = unknown> {
  id: string
  projectId: string | null
  sessionId: string | null
  sequence: number
  type: string
  payload: T
  createdAt: number
}

interface EventEnvelope {
  directory?: string
  payload: SyncEvent | { type: string; properties: Record<string, unknown> }
}
```
