# Tool Registry System

## Overview

The tool registry provides a unified interface for all tools available to agents, including:
- Built-in tools (file, shell, search, etc.)
- Config-defined tools
- Plugin tools
- MCP-derived tools

## Registry Architecture

```typescript
interface ToolRegistry {
  // Get a specific tool
  get(name: string): ToolDef<any, any> | undefined
  
  // Get all tools
  getAll(): ToolDef<any, any>[]
  
  // Register a tool
  register(tool: ToolDef<any, any>): void
  
  // Unregister a tool
  unregister(name: string): void
  
  // Filter tools for a context
  filter(ctx: ToolCtx, tools: ToolDef<any, any>[]): ToolDef<any, any>[]
}

interface ToolDef<I, O> {
  name: string
  description: string
  permission: string
  input: z.ZodType<I>
  output: z.ZodType<O>
  enabled: (ctx: ToolCtx) => boolean
  execute: (ctx: ToolCtx, input: I) => Promise<O>
}

interface ToolCtx {
  project: ProjectInstance
  session: Session
  agent: Agent
  provider: Provider
  permission: PermissionEngine
  logger: Logger
  abort: AbortSignal
}
```

## Registry Assembly Order

```
1. Register built-in tools (code)
   ↓
2. Load config-defined tools (tool/, tools/ directories)
   ↓
3. Load plugin-defined tools
   ↓
4. Load MCP-derived tools (for connected servers)
   ↓
5. Filter merged list by:
   - Agent allowlist/denylist
   - Permission policy
   - Provider/model capability
   - Feature flags
```

## Built-In Tools

### Question Tool
```typescript
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
  execute: async (ctx, input) => {
    const question = await ctx.session.createQuestion(input.prompt)
    await ctx.session.waitForAnswer(question.id)
    return { answers: question.answers, asked: true }
  }
}
```

### Bash Tool
```typescript
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
  execute: async (ctx, input) => {
    const result = await execShell(input.command, {
      cwd: input.cwd || ctx.project.directory,
      timeout: input.timeout_ms,
    })
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      duration_ms: result.durationMs,
    }
  }
}
```

### Read Tool
```typescript
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
  execute: async (ctx, input) => {
    const text = await readFile(input.path, input.start, input.end)
    return { path: input.path, text }
  }
}
```

### Glob Tool
```typescript
{
  name: 'glob',
  description: 'Find files matching pattern',
  permission: 'glob',
  input: z.object({
    pattern: z.string(),
    cwd: z.string().optional(),
  }),
  output: z.object({
    matches: z.array(z.string()),
  }),
  execute: async (ctx, input) => {
    const matches = await glob(input.pattern, input.cwd || ctx.project.directory)
    return { matches }
  }
}
```

### Grep Tool
```typescript
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
  execute: async (ctx, input) => {
    const matches = await grep(input.pattern, input.cwd, input.limit)
    return { matches }
  }
}
```

### Edit Tool
```typescript
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
  execute: async (ctx, input) => {
    const changed = await editFile(input.path, input.old, input.new, input.replace_all)
    return { path: input.path, changed }
  }
}
```

### Write Tool
```typescript
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
  execute: async (ctx, input) => {
    const bytes = await writeFile(input.path, input.text)
    return { path: input.path, bytes }
  }
}
```

### Apply Patch Tool
```typescript
{
  name: 'apply_patch',
  description: 'Apply a patch',
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
  }
}
```

### Task Tool
```typescript
{
  name: 'task',
  description: 'Delegate to sub-agent',
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
  execute: async (ctx, input) => {
    const child = input.task_id
      ? await ctx.session.resumeChild(input.task_id)
      : await ctx.session.spawnChild(input.agent)
    await child.run(input.task, input.context)
    const result = await child.getResult()
    return {
      task_id: child.id,
      result: result.summary,
      status: result.error ? 'error' : 'completed',
    }
  }
}
```

### Web Fetch Tool
```typescript
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
  execute: async (ctx, input) => {
    const response = await fetch(input.url)
    const text = await response.text()
    return { url: input.url, status: response.status, text }
  }
}
```

### Todo Write Tool
```typescript
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
  execute: async (ctx, input) => {
    await ctx.session.setTodo(input.items)
    return { count: input.items.length }
  }
}
```

### Web Search Tool
```typescript
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
  execute: async (ctx, input) => {
    const results = await webSearch(input.query, input.limit)
    return { results }
  }
}
```

### Code Search Tool
```typescript
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
  execute: async (ctx, input) => {
    const hits = await codeSearch(input.query, input.limit)
    return { hits }
  }
}
```

### Skill Tool
```typescript
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
  execute: async (ctx, input) => {
    const content = await loadSkill(input.name, input.path)
    return { path: input.path || input.name, content }
  }
}
```

## Permission Keys

```typescript
const PERMISSION_KEYS = [
  'read',
  'edit',
  'write',
  'glob',
  'grep',
  'bash',
  'task',
  'skill',
  'lsp',
  'todowrite',
  'webfetch',
  'websearch',
  'codesearch',
  'mcp',
  'external_directory',
  'doom_loop',
]

// Map similar tools to logical permissions
const PERMISSION_MAPPING = {
  apply_patch: 'edit',
  multiedit: 'edit',
  webfetch: 'network',
  websearch: 'network',
  codesearch: 'network',
}
```

## Provider/Model Filtering

```typescript
function filterToolsForModel(
  tools: ToolDef<any, any>[],
  agent: Agent,
  provider: Provider
): ToolDef<any, any>[] {
  return tools.filter(tool => {
    // Check enabled function
    if (tool.enabled && !tool.enabled(getToolContext())) {
      return false
    }
    
    // Check agent allowed tools
    if (agent.allowedTools && !agent.allowedTools.includes(tool.name)) {
      return false
    }
    
    // Check model capability for apply_patch
    if (tool.name === 'apply_patch' && !provider.supportsPatch) {
      return false
    }
    
    // Check network access
    if (tool.permission === 'network' && !hasNetworkAccess()) {
      return false
    }
    
    // Check read-only agent
    if (agent.isReadOnly && !tool.isReadOnly?.()) {
      return false
    }
    
    return true
  })
}
```

## Tool Lifecycle Metadata

Every tool call stores:

```typescript
interface ToolCallMetadata {
  callId: string
  state: 'running' | 'completed' | 'errored'
  input: unknown
  output?: unknown
  error?: string
  title?: string
  attachments?: Attachment[]
  metadata?: Record<string, unknown>
  time: {
    start: number
    end?: number
  }
}
```

## Result Normalization

```typescript
function normalizeToolResult(result: unknown): unknown {
  // Ensure JSON-safe
  const safe = JSON.parse(JSON.stringify(result))
  
  // Truncate large fields
  for (const [key, value] of Object.entries(safe)) {
    if (typeof value === 'string' && value.length > MAX_RESULT_LENGTH) {
      safe[key] = value.slice(0, MAX_RESULT_LENGTH)
      safe[key + '_truncated'] = true
    }
  }
  
  return safe
}
```

## Registry Guarantees

1. Built-in tools always present (may be disabled stubs)
2. MCP tools removed on server disconnect
3. Plugin/config tools load after built-ins, before MCP
4. Tool names must be unique in registry
5. MCP tools prefixed with server name if collision risk
