# QUERY LOOP SPECIFICATION

This document defines the complete, deterministic query loop for the agent platform.

---

## 1. SESSION RUNTIME STATES

```
idle              → No active work
running           → Processing prompts
waiting_permission → Blocked on permission
waiting_question  → Blocked on question
waiting_subtask   → Blocked on child session
compacting        → Running compaction
aborted           → User interrupted
errored           → Failed with error
```

---

## 2. MAIN PROMPT LOOP (STEP-BY-STEP)

```typescript
async function promptLoop(ctx: SessionCtx): Promise<void> {
  for (;;) {
    // STEP 1: Load current session state
    const state = await loadSessionState(ctx)
    
    // STEP 2: Handle pending subtask (from task tool)
    if (state.pendingSubtask) {
      await runSubtask(ctx, state.pendingSubtask)
      continue
    }
    
    // STEP 3: Handle compaction (token budget > 80%)
    if (state.needsCompaction) {
      await runCompaction(ctx)
      continue
    }
    
    // STEP 4: Check termination conditions
    if (await shouldTerminate(ctx, state)) {
      break
    }
    
    // STEP 5: Create assistant message
    const msg = await ctx.session.createAssistantMessage()
    
    // STEP 6: Build model request
    const req = await buildModelRequest(ctx, state, msg)
    
    // STEP 7: Start streaming from provider
    const stream = await ctx.provider.stream(req)
    
    // STEP 8: Process stream events
    const result = await processStream(ctx, msg, stream)
    
    // STEP 9: Check result type
    if (result.type === 'structured_output_complete') {
      await ctx.session.setStatus('idle')
      return
    }
    
    if (result.type === 'done' && result.pendingToolCalls.length === 0) {
      await ctx.session.setStatus('idle')
      return
    }
    
    // STEP 10: Loop continues with tool results as new context
  }
}
```

---

## 3. STATE LOADING

```typescript
async function loadSessionState(ctx: SessionCtx): Promise<SessionState> {
  // Get runtime state (in-memory, not from DB)
  const runtime = ctx.session.getRuntime()
  
  // Check for pending subtask parts
  const lastMessage = await ctx.session.getLastMessage()
  const subtaskPart = lastMessage?.parts.find(p => p.type === 'subtask')
  
  // Check token budget for compaction
  const budget = await ctx.session.getTokenBudget()
  const needsCompaction = budget.used / budget.total > 0.8
  
  // Get message history for model (respecting budget)
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
    stepCount: runtime.stepCount,
    pendingToolCalls: runtime.pendingToolCalls,
  }
}
```

---

## 4. MODEL REQUEST BUILDING

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

---

## 5. STREAM PROCESSING (DETERMINISTIC)

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
  
  for await (const event of stream) {
    switch (event.type) {
      case 'text-start':
        // Initialize text buffer
        break
        
      case 'text-delta':
        // Append text to message
        await msg.appendPart({ type: 'text', text: event.text })
        break
        
      case 'text-end':
        // Finalize text part
        break
        
      case 'reasoning-start':
        // Model is thinking
        break
        
      case 'reasoning-delta':
        // Append reasoning to message
        await msg.appendPart({ type: 'reasoning', text: event.text })
        break
        
      case 'reasoning-end':
        // Finalize reasoning part
        break
        
      case 'tool-call':
        // Create tool call in message
        const toolCall = await msg.appendToolCall({
          id: event.callId,
          name: event.name,
          input: event.input,
          state: 'running',
        })
        pendingToolCalls.push(toolCall)
        break
        
      case 'tool-result':
        // Tool finished, update message
        await msg.setToolResult(event.callId, event.result)
        pendingToolCalls = pendingToolCalls.filter(tc => tc.id !== event.callId)
        break
        
      case 'tool-error':
        // Tool failed
        await msg.setToolError(event.callId, event.error)
        pendingToolCalls = pendingToolCalls.filter(tc => tc.id !== event.callId)
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
    type: structuredOutput ? 'structured_output_complete' : 'done',
    pendingToolCalls,
    structuredOutput,
  }
}
```

---

## 6. TERMINATION CHECK (EXPLICIT)

```typescript
async function shouldTerminate(
  ctx: SessionCtx,
  state: RuntimeState
): Promise<boolean> {
  // Get session status
  const status = ctx.session.getStatus()
  
  // Check blocking states
  if (status === 'aborted') return true
  if (status === 'errored') return true
  if (status === 'waiting_permission') return true
  if (status === 'waiting_question') return true
  if (status === 'waiting_subtask') return true
  
  // Check step limit
  if (state.stepCount >= ctx.session.getAgent().maxSteps) {
    await ctx.session.setError('max_steps_reached')
    return true
  }
  
  // Check doom loop
  if (isDoomLoop(state)) {
    await handleDoomLoop(ctx)
    return true
  }
  
  return false
}

function isDoomLoop(state: RuntimeState): boolean {
  const lastCall = state.lastToolCall
  if (!lastCall) return false
  
  const normalized = normalizeToolCall(lastCall)
  const count = state.toolCallCount.get(normalized) || 0
  return count >= 3
}
```

---

## 7. TOOL EXECUTION WITHIN LOOP

```typescript
async function executeToolCall(
  ctx: SessionCtx,
  msg: Message,
  toolCall: ToolCall
): Promise<void> {
  // STEP 1: Check permission
  const permission = await ctx.permission.check(toolCall.name, toolCall.input)
  
  if (permission.action === 'deny') {
    await msg.setToolError(toolCall.id, 'permission_denied')
    return
  }
  
  if (permission.action === 'ask') {
    // Emit permission request event
    ctx.sync.emit({
      type: 'permission.asked',
      requestId: permission.requestId,
    })
    
    // Pause session
    await ctx.session.setStatus('waiting_permission')
    
    // Wait for user response (handled in separate flow)
    await waitForPermission(permission.requestId)
    
    // Resume after permission granted
    await ctx.session.setStatus('running')
  }
  
  // STEP 2: Execute tool
  try {
    const result = await ctx.tool.execute(toolCall.name, toolCall.input, ctx)
    
    // STEP 3: Normalize and store result
    await msg.setToolResult(toolCall.id, result)
    
  } catch (error) {
    // STEP 4: Handle error
    await msg.setToolError(toolCall.id, error.message)
  }
}
```

---

## 8. RETRY LOGIC (DETERMINISTIC)

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

---

## 9. SUBTASK EXECUTION

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

---

## 10. COMPACTION EXECUTION

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

---

This query loop specification is COMPLETE and DETERMINISTIC. Every step, transition, and decision is explicit.