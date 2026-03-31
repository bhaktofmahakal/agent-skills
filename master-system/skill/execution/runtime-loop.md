# Main Runtime Loop

## Overview

The runtime loop is the core engine that processes user prompts and generates assistant responses through repeated model calls and tool executions.

## Session Runtime State

```typescript
interface SessionRuntime {
  status: SessionStatus
  currentMessageId: string | null
  stepCount: number
  abortController: AbortController | null
  pendingToolCalls: Map<string, ToolCall>
  pendingStructuredOutput: z.ZodType<any> | null
  lastToolCall: { name: string; input: unknown } | null
  toolCallCount: Map<string, number>
}

type SessionStatus = 
  | 'idle'
  | 'running'
  | 'waiting_permission'
  | 'waiting_question'
  | 'waiting_subtask'
  | 'compacting'
  | 'aborted'
  | 'errored'
```

## Main Loop Structure

```typescript
async function runPromptLoop(
  ctx: SessionCtx,
  initialMessage: UserMessage
): Promise<void> {
  // Add initial user message
  await ctx.session.addMessage(initialMessage)
  
  // Mark session as running
  await ctx.session.setStatus('running')
  
  // Main loop
  while (true) {
    // 1. Load current state
    const state = await loadRuntimeState(ctx)
    
    // 2. Handle pending subtask
    if (state.pendingSubtask) {
      await runSubtask(ctx, state.pendingSubtask)
      continue
    }
    
    // 3. Handle compaction
    if (state.needsCompaction) {
      await runCompaction(ctx)
      continue
    }
    
    // 4. Check termination conditions
    if (await shouldTerminate(ctx, state)) {
      break
    }
    
    // 5. Create assistant message
    const assistantMsg = await ctx.session.createMessage({
      role: 'assistant',
    })
    
    // 6. Build model request
    const request = await buildModelRequest(ctx, state)
    
    // 7. Start streaming
    const stream = await ctx.provider.streamText(request)
    
    // 8. Process stream
    const result = await processStream(ctx, assistantMsg, stream)
    
    // 9. Check result
    if (result.type === 'structured_output_complete') {
      await ctx.session.setStatus('idle')
      return
    }
    
    if (result.type === 'done' && result.pendingToolCalls.length === 0) {
      await ctx.session.setStatus('idle')
      return
    }
    
    // 10. Loop continues with tool results
  }
}
```

## State Loading

```typescript
async function loadRuntimeState(ctx: SessionCtx): Promise<RuntimeState> {
  // Get current runtime state
  const runtime = ctx.session.getRuntime()
  
  // Check for pending subtask
  const lastMessage = await ctx.session.getLastMessage()
  const subtaskPart = lastMessage?.parts.find(p => p.type === 'subtask')
  
  // Check token budget
  const tokenUsage = await ctx.session.getTokenUsage()
  const needsCompaction = tokenUsage.used / tokenUsage.limit > 0.8
  
  // Get recent messages for context
  const messages = await ctx.session.getMessages({
    limit: getMessageWindowSize(tokenUsage),
  })
  
  // Get available tools
  const tools = ctx.tool.getAvailable(ctx)
  
  return {
    messages,
    tools,
    pendingSubtask: subtaskPart,
    needsCompaction,
    stepCount: runtime.stepCount,
    pendingToolCalls: runtime.pendingToolCalls,
  }
}
```

## Model Request Building

```typescript
async function buildModelRequest(
  ctx: SessionCtx,
  state: RuntimeState
): Promise<ModelRequest> {
  // Get agent definition
  const agent = ctx.session.getAgent()
  
  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    agent,
    project: ctx.project,
    instructions: await getInstructions(ctx),
    environment: await getEnvironmentInfo(ctx),
  })
  
  // Convert messages to model format
  const modelMessages = state.messages.map(toModelMessage)
  
  // Filter tools for this agent
  const tools = ctx.tool.filterForAgent(state.tools, agent)
  
  // Check for structured output requirement
  const format = ctx.session.getFormat()
  
  return {
    model: ctx.session.model,
    temperature: agent.temperature,
    maxTokens: ctx.session.maxTokens,
    system: systemPrompt,
    messages: modelMessages,
    tools: format ? [...tools, StructuredOutputTool] : tools,
  }
}

function buildSystemPrompt(params: SystemPromptParams): string {
  const parts: string[] = []
  
  // Agent prompt
  parts.push(params.agent.prompt)
  
  // Environment section
  parts.push(`## Environment\n${params.environment}`)
  
  // Instructions
  if (params.instructions) {
    parts.push(`## Instructions\n${params.instructions}`)
  }
  
  return parts.join('\n\n')
}
```

## Stream Processing

```typescript
async function processStream(
  ctx: SessionCtx,
  message: Message,
  stream: AsyncGenerator<StreamEvent>
): Promise<StreamResult> {
  let pendingToolCalls: ToolCall[] = []
  let structuredOutput: unknown = null
  let lastToolCall: { name: string; input: unknown } | null = null
  
  for await (const event of stream) {
    switch (event.type) {
      case 'text-delta':
        await message.appendPart({ type: 'text', text: event.delta })
        break
        
      case 'reasoning-delta':
        await message.appendPart({ type: 'reasoning', text: event.delta })
        break
        
      case 'tool-call':
        const toolCall = await message.appendToolCall({
          name: event.name,
          input: event.input,
          callId: event.callId,
          state: 'running',
        })
        pendingToolCalls.push(toolCall)
        lastToolCall = { name: event.name, input: event.input }
        break
        
      case 'tool-result':
        await message.setToolResult(event.callId, event.result)
        pendingToolCalls = pendingToolCalls.filter(
          tc => tc.id !== event.callId
        )
        break
        
      case 'error':
        await message.setError(event.error)
        break
        
      case 'finish':
        structuredOutput = event.structuredOutput
        break
    }
    
    // Emit sync event
    ctx.sync.emit({
      type: 'message.part.updated',
      sessionId: ctx.session.id,
      messageId: message.id,
      part: event,
    })
  }
  
  // Execute pending tool calls
  for (const toolCall of pendingToolCalls) {
    await executeTool(ctx, toolCall)
  }
  
  return {
    type: structuredOutput ? 'structured_output_complete' : 'done',
    pendingToolCalls,
    structuredOutput,
  }
}
```

## Termination Check

```typescript
async function shouldTerminate(
  ctx: SessionCtx,
  state: RuntimeState
): Promise<boolean> {
  // Check session status
  const status = ctx.session.getStatus()
  
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
  
  // Check for doom loop
  if (isDoomLoop(state)) {
    await handleDoomLoop(ctx)
    return true
  }
  
  return false
}

function isDoomLoop(state: RuntimeState): boolean {
  const lastCall = state.lastToolCall
  if (!lastCall) return false
  
  const count = state.toolCallCount.get(normalizeToolCall(lastCall)) || 0
  return count >= 3
}
```
