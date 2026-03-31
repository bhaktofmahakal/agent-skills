# Tool Execution Lifecycle

## Overview

Every tool execution follows a well-defined lifecycle from the model calling the tool to the result being returned and stored in the transcript.

## Lifecycle Phases

```
┌─────────────────────────────────────────────────────────────┐
│                   TOOL EXECUTION LIFECYCLE                  │
├─────────────────────────────────────────────────────────────┤
│  1. VALIDATE          → Validate tool name and input       │
│  2. PERMISSION        → Check permission engine            │
│  3. START EVENT      → Emit tool.started event             │
│  4. EXECUTE          → Run the tool implementation          │
│  5. NORMALIZE        → Validate and normalize output       │
│  6. PERSIST          → Store result as message part        │
│  7. FINISH EVENT     → Emit tool.finished event            │
│  8. RETURN          → Return result to model loop         │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Validation

```typescript
async function validateToolCall(
  ctx: ToolCtx,
  toolName: string,
  input: unknown
): Promise<ValidationResult> {
  // 1. Get tool from registry
  const tool = ctx.tool.get(toolName)
  if (!tool) {
    return {
      valid: false,
      error: `Unknown tool: ${toolName}`,
    }
  }
  
  // 2. Validate input against schema
  try {
    const parsed = tool.input.parse(input)
    return { valid: true, input: parsed }
  } catch (e) {
    return {
      valid: false,
      error: `Invalid input: ${e.message}`,
    }
  }
}
```

## Phase 2: Permission Check

```typescript
async function checkToolPermission(
  ctx: ToolCtx,
  toolName: string,
  input: unknown
): Promise<PermissionResult> {
  const tool = ctx.tool.get(toolName)
  const permissionKey = tool?.permission || toolName
  
  // Evaluate against permission engine
  const result = await ctx.permission.evaluate(
    permissionKey,
    input,
    {
      sessionId: ctx.session.id,
      projectId: ctx.session.projectId,
      agent: ctx.session.agent,
    }
  )
  
  return result
}

interface PermissionResult {
  action: 'allow' | 'ask' | 'deny'
  requestId?: string
  always?: string[]
}
```

## Phase 3: Start Event

```typescript
async function emitToolStarted(
  ctx: ToolCtx,
  toolName: string,
  input: unknown,
  callId: string
): Promise<void> {
  ctx.sync.emit({
    type: 'tool.started',
    sessionId: ctx.session.id,
    messageId: ctx.session.currentMessageId,
    callId,
    tool: toolName,
    input: sanitizeForEvent(input),
    timestamp: Date.now(),
  })
}
```

## Phase 4: Execution

```typescript
async function executeTool(
  ctx: ToolCtx,
  toolName: string,
  input: unknown,
  callId: string
): Promise<ToolResult> {
  const tool = ctx.tool.get(toolName)
  
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`)
  }
  
  // Create tool context with abort signal
  const toolCtx: ToolUseContext = {
    ...ctx,
    abort: ctx.abort,
    callId,
  }
  
  // Execute with timeout
  try {
    const result = await Promise.race([
      tool.execute(toolCtx, input),
      createTimeout(ctx.session.toolTimeout),
    ])
    
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Tool timeout')), ms)
  })
}
```

## Phase 5: Output Normalization

```typescript
function normalizeToolOutput(
  output: unknown,
  maxSize: number = MAX_TOOL_RESULT_SIZE
): NormalizedOutput {
  // Ensure JSON-safe
  let safe = tryParseJson(output)
  
  // Handle strings that are too long
  for (const [key, value] of Object.entries(safe)) {
    if (typeof value === 'string' && value.length > maxSize) {
      safe[key] = value.slice(0, maxSize)
      safe[`${key}_truncated`] = true
    }
  }
  
  // Verify against output schema if defined
  if (outputSchema) {
    const validation = outputSchema.safeParse(safe)
    if (!validation.success) {
      throw new Error(`Invalid output: ${validation.error}`)
    }
  }
  
  return safe
}

function tryParseJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}
```

## Phase 6: Persistence

```typescript
async function persistToolResult(
  ctx: ToolCtx,
  callId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  error?: string
): Promise<void> {
  // Get or create the message part
  const part = await ctx.session.getOrCreatePart(callId, {
    type: 'tool',
    name: toolName,
    state: error ? 'errored' : 'completed',
    input,
    output: error ? undefined : output,
    error,
    time: {
      start: ctx.session.toolStartTimes.get(callId),
      end: Date.now(),
    },
  })
  
  // Persist to database
  await ctx.session.persistPart(part)
  
  // Emit update event
  ctx.sync.emit({
    type: 'message.part.updated',
    sessionId: ctx.session.id,
    messageId: ctx.session.currentMessageId,
    partId: part.id,
    state: part.state,
  })
}
```

## Phase 7: Finish Event

```typescript
async function emitToolFinished(
  ctx: ToolCtx,
  toolName: string,
  callId: string,
  success: boolean,
  durationMs: number
): Promise<void> {
  ctx.sync.emit({
    type: 'tool.finished',
    sessionId: ctx.session.id,
    callId,
    tool: toolName,
    success,
    duration_ms: durationMs,
    timestamp: Date.now(),
  })
}
```

## Full Execution Flow

```typescript
async function executeToolWithLifecycle(
  ctx: ToolCtx,
  toolName: string,
  input: unknown
): Promise<ToolResult> {
  const callId = generateCallId()
  const startTime = Date.now()
  
  // Phase 1: Validation
  const validation = await validateToolCall(ctx, toolName, input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }
  
  // Store start time for duration calculation
  ctx.session.toolStartTimes.set(callId, startTime)
  
  // Phase 2: Permission check
  const permission = await checkToolPermission(ctx, toolName, input)
  if (permission.action === 'deny') {
    await persistToolResult(ctx, callId, toolName, input, null, 'permission_denied')
    return { success: false, error: 'permission_denied' }
  }
  
  if (permission.action === 'ask') {
    // Handle ask case - emit request, pause, wait for response
    await emitPermissionRequest(ctx, permission.requestId, toolName, input)
    return { success: false, error: 'waiting_permission' }
  }
  
  // Phase 3: Emit started event
  await emitToolStarted(ctx, toolName, input, callId)
  
  // Phase 4: Execute
  const executionResult = await executeTool(ctx, toolName, input, callId)
  
  // Phase 5: Normalize output
  let normalizedOutput: unknown = null
  let error: string | undefined = undefined
  
  if (executionResult.success) {
    normalizedOutput = normalizeToolOutput(executionResult.result)
  } else {
    error = executionResult.error
  }
  
  // Phase 6: Persist result
  await persistToolResult(
    ctx,
    callId,
    toolName,
    input,
    normalizedOutput,
    error
  )
  
  // Phase 7: Emit finished event
  const durationMs = Date.now() - startTime
  await emitToolFinished(
    ctx,
    toolName,
    callId,
    executionResult.success,
    durationMs
  )
  
  // Phase 8: Return result
  return executionResult
}
```

## Tool Cancellation

```typescript
async function cancelTool(
  ctx: ToolCtx,
  callId: string
): Promise<void> {
  // Check if tool supports cancellation
  const tool = ctx.tool.get(callId)
  if (tool?.interruptBehavior?.() === 'cancel') {
    // Send cancellation signal
    ctx.abort.abort()
  }
  
  // Update part state
  await ctx.session.updatePart(callId, {
    state: 'errored',
    error: 'cancelled',
  })
  
  // Emit cancellation event
  ctx.sync.emit({
    type: 'tool.cancelled',
    sessionId: ctx.session.id,
    callId,
  })
}
```

## Tool Progress Updates

For long-running tools, progress updates are emitted:

```typescript
async function executeWithProgress<T>(
  ctx: ToolCtx,
  tool: ToolDef<any, T>,
  input: unknown,
  onProgress: (progress: ProgressEvent) => void
): Promise<T> {
  // ... execute tool with progress callbacks
  
  // Emit progress events
  onProgress({ type: 'progress', percent: 50 })
  
  return result
}
```

## Error Handling

```typescript
interface ToolError {
  code: string
  message: string
  tool?: string
  input?: unknown
  stack?: string
}

function handleToolError(
  ctx: ToolCtx,
  toolName: string,
  error: Error,
  callId: string
): ToolError {
  const code = categorizeError(error)
  
  const toolError: ToolError = {
    code,
    message: error.message,
    tool: toolName,
  }
  
  // Log for debugging
  ctx.logger.error(`Tool ${toolName} failed:`, error)
  
  // Emit error event
  ctx.sync.emit({
    type: 'tool.error',
    sessionId: ctx.session.id,
    callId,
    error: toolError,
  })
  
  return toolError
}

function categorizeError(error: Error): string {
  if (error.code === 'ENOENT') return 'file_not_found'
  if (error.code === 'ETIMEDOUT') return 'timeout'
  if (error.status === 403) return 'permission_denied'
  if (error.status === 404) return 'not_found'
  return 'tool_error'
}
```
