# Agent Loop Execution

## Overview

The agent loop is the core execution engine that processes user prompts and generates responses through repeated model calls and tool executions.

## Session Runtime States

```typescript
type SessionStatus = 
  | 'idle'           // No active work
  | 'running'        // Processing prompts
  | 'waiting_permission'  // Blocked on permission
  | 'waiting_question'    // Blocked on question
  | 'waiting_subtask'     // Blocked on child session
  | 'compacting'          // Running compaction
  | 'aborted'             // User interrupted
  | 'errored'             // Failed with error
```

## Main Prompt Loop

```typescript
async function promptLoop(ctx: SessionCtx): Promise<void> {
  for (;;) {
    // 1. Load current session state
    const state = await loadSessionState(ctx)
    
    // 2. Check for pending subtask (from task tool)
    if (state.pendingSubtask) {
      await runSubtask(ctx, state.pendingSubtask)
      continue
    }
    
    // 3. Check if compaction is needed
    if (state.needsCompaction) {
      await runCompaction(ctx)
      continue
    }
    
    // 4. Create new assistant message
    const msg = await ctx.session.createAssistantMessage()
    
    // 5. Build model request
    const req = await buildModelRequest(ctx, state, msg)
    
    // 6. Start streaming from provider
    const stream = await ctx.provider.stream(req)
    
    // 7. Process stream events
    const result = await processStream(ctx, msg, stream)
    
    // 8. Check termination conditions
    if (result.status === 'structured_output_complete') {
      await ctx.session.markComplete()
      return
    }
    
    if (result.status === 'done' && !result.pendingToolCalls.length) {
      await ctx.session.markIdle()
      return
    }
    
    // 9. Loop continues with tool results as new context
  }
}
```

## State Loading

```typescript
async function loadSessionState(ctx: SessionCtx): Promise<SessionState> {
  // Get runtime state (not from DB)
  const runtime = ctx.session.getRuntime()
  
  // Check for pending subtask parts
  const recentParts = await ctx.session.getParts(runtime.lastMessageId)
  const subtaskPart = recentParts.find(p => p.type === 'subtask')
  
  // Check token budget for compaction
  const budget = await ctx.session.getTokenBudget()
  const needsCompaction = budget.used / budget.total > 0.8
  
  // Get message history for model
  const messages = await ctx.session.getMessages({
    limit: budget.maxMessages,
  })
  
  // Get available tools for agent
  const tools = await ctx.tool.getTools(ctx, ctx.session.agent)
  
  return {
    pendingSubtask: subtaskPart,
    needsCompaction,
    messages,
    tools,
    budget,
  }
}
```

## Model Request Building

```typescript
async function buildModelRequest(
  ctx: SessionCtx,
  state: SessionState,
  message: Message
): Promise<ModelRequest> {
  // Build system prompt from components
  const systemPrompt = await buildSystemPrompt(ctx, state)
  
  // Convert messages to model format
  const modelMessages = await convertToModelMessages(state.messages)
  
  // Apply tool filtering for model
  const tools = filterToolsForModel(state.tools, ctx.session.agent)
  
  // Check for structured output requirement
  const structuredOutput = state.format 
    ? { schema: state.format }
    : undefined
  
  return {
    model: ctx.session.model,
    temperature: ctx.session.agent.temperature,
    maxTokens: state.budget.remaining,
    system: systemPrompt,
    messages: modelMessages,
    tools,
    structuredOutput,
  }
}

async function buildSystemPrompt(ctx: SessionCtx, state: SessionState): Promise<string> {
  const parts: string[] = []
  
  // 1. Agent prompt
  parts.push(ctx.session.agent.prompt)
  
  // 2. Environment section
  parts.push(await buildEnvironmentSection(ctx))
  
  // 3. Instruction files (CLAUDE.md, AGENTS.md, etc.)
  parts.push(await buildInstructionSection(ctx))
  
  // 4. Reminder prompts
  if (ctx.session.agent.name === 'plan' || state.needsReminders) {
    parts.push(await buildReminders(ctx, state))
  }
  
  return parts.join('\n\n')
}
```

## Stream Processing

```typescript
type StreamEvent =
  | { type: 'text-start' }
  | { type: 'text-delta'; text: string }
  | { type: 'text-end' }
  | { type: 'reasoning-start' }
  | { type: 'reasoning-delta'; text: string }
  | { type: 'reasoning-end' }
  | { type: 'tool-call'; name: string; input: unknown; callId: string }
  | { type: 'tool-result'; callId: string; result: unknown }
  | { type: 'tool-error'; callId: string; error: string }
  | { type: 'step-start'; step: number }
  | { type: 'step-finish'; step: number }
  | { type: 'finish'; structuredOutput?: unknown }
  | { type: 'error'; error: string }

async function processStream(
  ctx: SessionCtx,
  msg: Message,
  stream: AsyncIterator<StreamEvent>
): Promise<ProcessResult> {
  let pendingToolCalls: ToolCall[] = []
  let structuredOutput: unknown = null
  let currentToolCall: ToolCall | null = null
  
  for await (const event of stream) {
    switch (event.type) {
      case 'text-start':
        // Starting text output
        break
        
      case 'text-delta':
        // Append text to message
        await msg.appendPart({
          type: 'text',
          text: event.text,
        })
        break
        
      case 'text-end':
        // Text complete
        break
        
      case 'reasoning-start':
        // Model is thinking
        break
        
      case 'reasoning-delta':
        // Append reasoning
        await msg.appendPart({
          type: 'reasoning',
          text: event.text,
        })
        break
        
      case 'reasoning-end':
        // Reasoning complete
        break
        
      case 'tool-call':
        // Create tool call in message
        currentToolCall = await msg.appendToolCall({
          id: event.callId,
          name: event.name,
          input: event.input,
          state: 'running',
        })
        pendingToolCalls.push(currentToolCall)
        break
        
      case 'tool-result':
        // Tool finished, update message
        await msg.setToolResult(event.callId, event.result)
        pendingToolCalls = pendingToolCalls.filter(
          tc => tc.id !== event.callId
        )
        currentToolCall = null
        break
        
      case 'tool-error':
        // Tool failed
        await msg.setToolError(event.callId, event.error)
        pendingToolCalls = pendingToolCalls.filter(
          tc => tc.id !== event.callId
        )
        currentToolCall = null
        break
        
      case 'finish':
        // Stream complete
        structuredOutput = event.structuredOutput
        break
        
      case 'error':
        // Stream error
        await msg.setError(event.error)
        break
    }
    
    // Emit sync event for each part update
    ctx.sync.emit({
      type: 'message.part.updated',
      sessionId: ctx.session.id,
      messageId: msg.id,
      part: event,
    })
  }
  
  // Execute pending tool calls
  for (const toolCall of pendingToolCalls) {
    await executeToolCall(ctx, msg, toolCall)
  }
  
  return {
    status: structuredOutput ? 'structured_output_complete' : 'done',
    pendingToolCalls,
    structuredOutput,
  }
}
```

## Tool Execution Within Loop

```typescript
async function executeToolCall(
  ctx: SessionCtx,
  msg: Message,
  toolCall: ToolCall
): Promise<void> {
  // 1. Check permission
  const permission = await ctx.permission.check(
    toolCall.name,
    toolCall.input
  )
  
  if (permission.action === 'deny') {
    await msg.setToolError(toolCall.id, 'permission_denied')
    return
  }
  
  if (permission.action === 'ask') {
    // Emit permission request
    ctx.sync.emit({
      type: 'permission.asked',
      requestId: permission.requestId,
    })
    
    // Pause session
    await ctx.session.setStatus('waiting_permission')
    
    // Wait for response (handles in separate flow)
    await waitForPermission(permission.requestId)
    
    // Resume after permission granted
    await ctx.session.setStatus('running')
  }
  
  // 2. Execute tool
  try {
    const result = await ctx.tool.execute(
      toolCall.name,
      toolCall.input,
      ctx
    )
    
    // 3. Normalize and store result
    await msg.setToolResult(toolCall.id, result)
    
  } catch (error) {
    // 4. Handle error
    await msg.setToolError(toolCall.id, error.message)
  }
}
```

## Subtask Execution

```typescript
async function runSubtask(
  ctx: SessionCtx,
  subtaskPart: SubtaskPart
): Promise<void> {
  // Create child session
  const child = await ctx.session.spawnChild({
    agent: subtaskPart.agent,
    parentId: ctx.session.id,
    context: subtaskPart.prompt,
  })
  
  // Set status to waiting
  await ctx.session.setStatus('waiting_subtask')
  
  // Run child's prompt loop
  await child.run(subtaskPart.prompt)
  
  // Get result
  const result = await child.getResult()
  
  // Store in parent's task tool result
  await ctx.session.setTaskResult(subtaskPart.callId, {
    task_id: child.id,
    result: result.summary,
    status: result.error ? 'error' : 'completed',
  })
  
  // Resume parent
  await ctx.session.setStatus('running')
}
```

## Compaction Execution

```typescript
async function runCompaction(ctx: SessionCtx): Promise<void> {
  // Set status
  await ctx.session.setStatus('compacting')
  
  // Get current messages
  const messages = await ctx.session.getMessages({ limit: 100 })
  
  // Call compaction agent
  const summary = await ctx.agent.run('compaction', {
    messages: messages.map(m => m.toText()),
    budget: await ctx.session.getTokenBudget(),
  })
  
  // Store compaction summary
  await ctx.session.appendPart({
    type: 'compaction',
    summary: summary.text,
  })
  
  // Prune old messages
  await ctx.session.pruneMessages({
    keepSummary: summary.text,
    keepRecent: 10,
  })
  
  // Resume
  await ctx.session.setStatus('running')
}
```

## Termination Rules

The loop terminates when ANY of these conditions are true:

1. **Task Complete**: No pending tool calls and model finished naturally
2. **Structured Output**: Valid structured output produced and validated
3. **Blocked on Input**: Session status is `waiting_permission` or `waiting_question`
4. **Permission Denied**: A permission denial makes continuation impossible
5. **Retry Exhausted**: Max retry attempts reached for transient errors
6. **Doom Loop**: Same tool called 3x with same input
7. **Compaction Required**: Context overflow and current agent is not compaction agent
8. **Aborted**: User explicitly aborted

## Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 4, backoff = [0, 500, 1000, 2000] } = options
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      // Only retry transient errors
      if (!isTransientError(error)) {
        throw error
      }
      
      if (attempt === maxAttempts - 1) {
        throw error
      }
      
      // Wait before retry
      await sleep(backoff[attempt])
    }
  }
}

function isTransientError(error: Error): boolean {
  return (
    error.code === 'network' ||
    error.code === 'timeout' ||
    error.status === 429 ||
    error.status === 503
  )
}
```
