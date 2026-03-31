# Async Prompt Execution

## Overview

The system supports asynchronous prompt execution so the client doesn't block on long-running HTTP requests. This is achieved through a poll-based model where the client submits prompts and receives updates via SSE.

## Async Flow

```
Client submits prompt
    ↓
Server accepts and returns immediately
    ↓
Server processes in background
    ↓
Server streams progress via SSE
    ↓
Client updates UI in real-time
    ↓
Server signals completion
    ↓
Client can fetch final result
```

## API Endpoints

### Synchronous (legacy)
```
POST /session/:id/prompt
```
- Blocks until completion
- Returns final message

### Async (preferred)
```
POST /session/:id/prompt_async
```
- Returns immediately with { accepted: true }
- Processing continues in background
- Client subscribes to /event for updates

## Async Request Handling

```typescript
// POST /session/:id/prompt_async
async function handlePromptAsync(
  c: Context
): Promise<Response> {
  const sessionId = c.req.param('id')
  const body = await c.req.json<PromptRequest>()
  
  // Validate request
  const prompt = promptSchema.parse(body)
  
  // Create user message
  const message = await createUserMessage(sessionId, prompt)
  
  // Return immediately
  return c.json({ accepted: true, messageId: message.id })
}

// Start processing in background
setImmediate(async () => {
  try {
    await runPromptLoop(ctx, message)
  } catch (error) {
    await handlePromptError(ctx, message, error)
  }
})
```

## Background Processing

```typescript
async function processPromptBackground(
  ctx: SessionCtx,
  message: Message
): Promise<void> {
  // Set session status
  await ctx.session.setStatus('running')
  
  try {
    // Run the main loop
    await runPromptLoop(ctx, message)
    
    // Mark success
    await ctx.session.setStatus('idle')
    await ctx.sync.emit({
      type: 'session.idle',
      sessionId: ctx.session.id,
    })
    
  } catch (error) {
    await handlePromptError(ctx, message, error)
  }
}

async function handlePromptError(
  ctx: SessionCtx,
  message: Message,
  error: Error
): Promise<void> {
  // Set error status
  await ctx.session.setStatus('errored')
  
  // Add error part
  await message.appendPart({
    type: 'error',
    code: error.code || 'unknown',
    message: error.message,
  })
  
  // Emit event
  await ctx.sync.emit({
    type: 'session.errored',
    sessionId: ctx.session.id,
    error: error.message,
  })
}
```

## Client Polling

```typescript
// Client subscribes to session status
async function subscribeToSession(
  sessionId: string,
  onUpdate: (status: SessionStatus) => void
): Promise<Unsubscribe> {
  // Open SSE connection
  const es = new EventSource(`/event?session=${sessionId}`)
  
  es.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    if (data.type === 'session.status') {
      onUpdate(data.status)
    }
  }
  
  return () => es.close()
}

// Usage
const unsubscribe = await subscribeToSession(sessionId, (status) => {
  if (status === 'idle') {
    // Load final messages
    loadMessages()
  } else if (status === 'errored') {
    // Show error
    showError()
  }
})
```

## Abort Support

```typescript
// Client can abort running prompt
async function abortSession(
  sessionId: string
): Promise<void> {
  await fetch(`/session/${sessionId}/abort`, {
    method: 'POST',
  })
}

// Server handles abort
async function handleAbort(
  ctx: SessionCtx
): Promise<void> {
  // Cancel abort controller
  ctx.session.getRuntime().abortController?.abort()
  
  // Add interrupt part
  await ctx.session.appendPart({
    type: 'error',
    code: 'aborted',
    message: 'Session aborted by user',
  })
  
  // Update status
  await ctx.session.setStatus('aborted')
}
```
