# TOOL SYSTEM SPECIFICATION

This document defines the complete tool system for the agent platform.

---

## 1. TOOL INTERFACE (STRICT)

```typescript
interface ToolDef<I, O> {
  name: string           // Unique identifier
  description: string    // One-line description
  permission: string    // Permission key
  input: z.ZodType<I>   // Input schema (Zod)
  output: z.ZodType<O>  // Output schema (Zod)
  enabled: (ctx: ToolCtx) => boolean  // Runtime filter
  execute: (ctx: ToolCtx, input: I) => Promise<O>  // Implementation
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

---

## 2. TOOL REGISTRY ASSEMBLY (ORDERED)

```
1. Register built-in tools from code
       ↓
2. Load config-defined tools from tool/ directories
       ↓
3. Load plugin-defined tools
       ↓
4. Load MCP-derived tools (for connected servers)
       ↓
5. Filter merged list by: agent, permission, provider, feature flags
```

---

## 3. BUILT-IN TOOLS (COMPLETE)

### question
```typescript
{
  name: 'question',
  description: 'Ask the user a question',
  permission: 'question',
  input: z.object({ prompt: z.string() }),
  output: z.object({ answers: z.array(z.array(z.string())), asked: z.literal(true) }),
  execute: async (ctx, input) => {
    const question = await ctx.session.createQuestion(input.prompt)
    await ctx.session.waitForAnswer(question.id)
    return { answers: question.answers, asked: true }
  }
}
```

### bash
```typescript
{
  name: 'bash',
  description: 'Execute a shell command',
  permission: 'bash',
  input: z.object({
    command: z.string(),
    cwd: z.string().optional(),
    timeout_ms: z.number().optional()
  }),
  output: z.object({
    stdout: z.string(),
    stderr: z.string(),
    exit_code: z.number(),
    duration_ms: z.number()
  }),
  execute: async (ctx, input) => {
    const start = Date.now()
    const result = await execShell(input.command, {
      cwd: input.cwd || ctx.project.directory,
      timeout: input.timeout_ms
    })
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      duration_ms: Date.now() - start
    }
  }
}
```

### read
```typescript
{
  name: 'read',
  description: 'Read a file',
  permission: 'read',
  input: z.object({
    path: z.string(),
    start: z.number().optional(),
    end: z.number().optional()
  }),
  output: z.object({ path: z.string(), text: z.string() }),
  execute: async (ctx, input) => {
    const text = await readFile(input.path, input.start, input.end)
    return { path: input.path, text }
  }
}
```

### glob
```typescript
{
  name: 'glob',
  description: 'Find files matching a pattern',
  permission: 'glob',
  input: z.object({ pattern: z.string(), cwd: z.string().optional() }),
  output: z.object({ matches: z.array(z.string()) }),
  execute: async (ctx, input) => {
    const cwd = input.cwd || ctx.project.directory
    const matches = await glob(input.pattern, cwd)
    return { matches }
  }
}
```

### grep
```typescript
{
  name: 'grep',
  description: 'Search for text in files',
  permission: 'grep',
  input: z.object({
    pattern: z.string(),
    cwd: z.string().optional(),
    limit: z.number().optional()
  }),
  output: z.object({
    matches: z.array(z.object({ path: z.string(), line: z.number(), text: z.string() }))
  }),
  execute: async (ctx, input) => {
    const cwd = input.cwd || ctx.project.directory
    const matches = await grep(input.pattern, cwd, input.limit)
    return { matches }
  }
}
```

### edit
```typescript
{
  name: 'edit',
  description: 'Edit a file',
  permission: 'edit',
  input: z.object({
    path: z.string(),
    old: z.string(),
    new: z.string(),
    replace_all: z.boolean().optional()
  }),
  output: z.object({ path: z.string(), changed: z.boolean() }),
  execute: async (ctx, input) => {
    const changed = await editFile(input.path, input.old, input.new, input.replace_all)
    return { path: input.path, changed }
  }
}
```

### write
```typescript
{
  name: 'write',
  description: 'Write a file',
  permission: 'write',
  input: z.object({ path: z.string(), text: z.string() }),
  output: z.object({ path: z.string(), bytes: z.number() }),
  execute: async (ctx, input) => {
    const bytes = await writeFile(input.path, input.text)
    return { path: input.path, bytes }
  }
}
```

### apply_patch
```typescript
{
  name: 'apply_patch',
  description: 'Apply a patch to files',
  permission: 'apply_patch',
  input: z.object({ patch: z.string() }),
  output: z.object({ files: z.array(z.string()) }),
  enabled: (ctx) => ctx.provider.supportsPatch,
  execute: async (ctx, input) => {
    const files = await applyPatch(input.patch, ctx.project.directory)
    return { files }
  }
}
```

### task
```typescript
{
  name: 'task',
  description: 'Delegate to a sub-agent',
  permission: 'task',
  input: z.object({
    agent: z.string(),
    task: z.string(),
    context: z.string().optional(),
    task_id: z.string().optional()
  }),
  output: z.object({
    task_id: z.string(),
    result: z.string(),
    status: z.enum(['completed', 'error'])
  }),
  execute: async (ctx, input) => {
    const child = input.task_id
      ? await ctx.session.resumeChild(input.task_id)
      : await ctx.session.spawnChild(input.agent)
    
    await child.prompt(input.task, input.context)
    const result = await child.waitForCompletion()
    
    return {
      task_id: child.id,
      result: result.summary,
      status: result.error ? 'error' : 'completed'
    }
  }
}
```

### webfetch
```typescript
{
  name: 'webfetch',
  description: 'Fetch a URL',
  permission: 'webfetch',
  input: z.object({ url: z.string().url() }),
  output: z.object({ url: z.string(), status: z.number(), text: z.string() }),
  execute: async (ctx, input) => {
    const response = await fetch(input.url)
    const text = await response.text()
    return { url: input.url, status: response.status, text }
  }
}
```

### todowrite
```typescript
{
  name: 'todowrite',
  description: 'Write todo items',
  permission: 'todowrite',
  input: z.object({
    items: z.array(z.object({ text: z.string(), done: z.boolean() }))
  }),
  output: z.object({ count: z.number() }),
  execute: async (ctx, input) => {
    await ctx.session.setTodo(input.items)
    return { count: input.items.length }
  }
}
```

### websearch
```typescript
{
  name: 'websearch',
  description: 'Search the web',
  permission: 'websearch',
  input: z.object({ query: z.string(), limit: z.number().optional() }),
  output: z.object({
    results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string() }))
  }),
  execute: async (ctx, input) => {
    const results = await webSearch(input.query, input.limit)
    return { results }
  }
}
```

### codesearch
```typescript
{
  name: 'codesearch',
  description: 'Search code repositories',
  permission: 'codesearch',
  input: z.object({ query: z.string(), limit: z.number().optional() }),
  output: z.object({
    hits: z.array(z.object({ path: z.string(), snippet: z.string(), score: z.number() }))
  }),
  execute: async (ctx, input) => {
    const hits = await codeSearch(input.query, input.limit)
    return { hits }
  }
}
```

### skill
```typescript
{
  name: 'skill',
  description: 'Load a skill',
  permission: 'skill',
  input: z.object({ name: z.string(), path: z.string().optional() }),
  output: z.object({ path: z.string(), content: z.string() }),
  execute: async (ctx, input) => {
    const content = await loadSkill(input.name, input.path)
    return { path: input.path || input.name, content }
  }
}
```

---

## 4. PERMISSION KEYS

```typescript
const PERMISSION_KEYS = [
  'read', 'edit', 'write', 'glob', 'grep', 'bash',
  'task', 'skill', 'lsp', 'todowrite',
  'webfetch', 'websearch', 'codesearch',
  'mcp', 'external_directory', 'doom_loop'
]

const PERMISSION_MAPPING = {
  apply_patch: 'edit',
  multiedit: 'edit',
  webfetch: 'network',
  websearch: 'network',
  codesearch: 'network'
}
```

---

## 5. TOOL EXECUTION RULES (DETERMINISTIC)

```
1. Validate tool exists in registry
2. Validate input against Zod schema
3. Check permission (allow/ask/deny)
4. If ask: emit event, pause, wait for user response
5. Execute with timeout (default 5 min)
6. Normalize output (JSON-safe, truncate > 100KB)
7. Persist result or error part
8. Emit completion event
```

---

## 6. PROVIDER/MODEL FILTERING

```typescript
function filterToolsForModel(
  tools: ToolDef<any, any>[],
  agent: Agent,
  provider: Provider
): ToolDef<any, any>[] {
  return tools.filter(tool => {
    // Check enabled function
    if (tool.enabled && !tool.enabled(getToolContext())) return false
    
    // Check agent allowed tools
    if (agent.allowedTools && !agent.allowedTools.includes(tool.name)) return false
    
    // Check model capability for apply_patch
    if (tool.name === 'apply_patch' && !provider.supportsPatch) return false
    
    // Check network access
    if (tool.permission === 'network' && !hasNetworkAccess()) return false
    
    // Check read-only agent
    if (agent.isReadOnly && !tool.isReadOnly?.()) return false
    
    return true
  })
}
```

---

## 7. RESULT NORMALIZATION

```typescript
function normalizeToolResult(result: unknown): unknown {
  // Ensure JSON-safe
  const safe = JSON.parse(JSON.stringify(result))
  
  // Truncate large fields (> 100KB)
  for (const [key, value] of Object.entries(safe)) {
    if (typeof value === 'string' && value.length > 100000) {
      safe[key] = value.slice(0, 100000)
      safe[key + '_truncated'] = true
    }
  }
  
  return safe
}
```

---

## 8. TOOL REGISTRY GUARANTEES

1. Built-in tools always present (may be disabled stubs)
2. MCP tools removed on server disconnect
3. Plugin/config tools load after built-ins, before MCP
4. Tool names must be unique in registry
5. MCP tools prefixed with server name if collision risk

---

This tool system specification is COMPLETE and DETERMINISTIC.