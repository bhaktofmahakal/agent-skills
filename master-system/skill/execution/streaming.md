# Stream Event Handling

## Overview

The system uses streaming to receive model output in real-time. Stream events are processed, persisted to the database, and emitted to clients via SSE.

## Stream Event Types

```typescript
type StreamEvent =
  // Text events
  | { type: 'text-start' }
  | { type: 'text-delta'; delta: string }
  | { type: 'text-done' }
  
  // Reasoning events
  | { type: 'reasoning-start' }
  | { type: 'reasoning-delta'; delta: string }
  | { type: 'reasoning-done' }
  
  // Tool events
  | { type: 'tool-call'; callId: string; name: string; input: unknown }
  | { type: 'tool-result'; callId: string; result: unknown }
  | { type: 'tool-error'; callId: string; error: string }
  
  // Step events
  | { type: 'step-start'; step: number }
  | { type: 'step-finish'; step: number }
  
  // Completion events
  | { type: 'finish'; usage?: Usage; structuredOutput?: unknown }
  | { type: 'error'; error: string }
```

## Event Processing Pipeline

```
Provider Stream
    ↓
┌─────────────────┐
│ Parse Events    │ ← Convert raw stream to typed events
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Validate       │ ← Validate event structure
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Persist        │ ← Write to database
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Emit SSE       │ ← Broadcast to clients
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Update UI      │ ← Client re-render
└─────────────────┘
```

## Event Parser

```typescript
class StreamParser {
  private buffer = ''
  
  async *parse(
    stream: ReadableStream<Uint8Array>
  ): AsyncGenerator<StreamEvent> {
    const reader = stream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      this.buffer += new TextDecoder().decode(value)
      
      // Process complete events (newline-delimited)
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        try {
          const event = JSON.parse(line)
          yield event
        } catch {
          // Handle non-JSON events (text deltas)
          yield { type: 'text-delta', delta: line }
        }
      }
    }
    
    // Process remaining buffer
    if (this.buffer.trim()) {
      yield { type: 'text-delta', delta: this.buffer }
    }
  }
}
```

## Event Persistence

```typescript
async function persistStreamEvent(
  ctx: SessionCtx,
  messageId: string,
  event: StreamEvent
): Promise<void> {
  switch (event.type) {
    case 'text-delta':
    case 'reasoning-delta':
      await ctx.session.appendPart(messageId, {
        type: event.type === 'text-delta' ? 'text' : 'reasoning',
        text: event.delta,
      })
      break
      
    case 'tool-call':
      await ctx.session.appendPart(messageId, {
        type: 'tool',
        name: event.name,
        input: event.input,
        callId: event.callId,
        state: 'running',
      })
      break
      
    case 'tool-result':
      await ctx.session.updatePart(messageId, event.callId, {
        state: 'completed',
        output: event.result,
      })
      break
      
    case 'tool-error':
      await ctx.session.updatePart(messageId, event.callId, {
        state: 'errored',
        error: event.error,
      })
      break
      
    case 'finish':
      await ctx.session.markComplete(messageId, event.structuredOutput)
      break
      
    case 'error':
      await ctx.session.setError(messageId, event.error)
      break
  }
}
```

## SSE Broadcasting

```typescript
function emitStreamEvent(
  ctx: SessionCtx,
  event: StreamEvent
): void {
  const envelope = {
    type: 'message.part.updated',
    sessionId: ctx.session.id,
    messageId: ctx.session.currentMessageId,
    timestamp: Date.now(),
    part: event,
  }
  
  // Write to SSE response
  ctx.sync.emit(envelope)
}
```

## Client-Side Handling

```typescript
// Client receives SSE events
function handleStreamEvent(
  store: SyncStore,
  envelope: EventEnvelope
): void {
  const { sessionId, messageId, part } = envelope.payload
  
  // Update session state
  const session = store.getSession(sessionId)
  const message = session?.messages.get(messageId)
  
  if (!message) return
  
  // Apply event
  switch (part.type) {
    case 'text-delta':
      message.text += part.delta
      break
      
    case 'reasoning-delta':
      message.reasoning += part.delta
      break
      
    case 'tool-call':
      message.toolCalls.push({
        id: part.callId,
        name: part.name,
        input: part.input,
        state: 'running',
      })
      break
      
    case 'tool-result':
      const toolCall = message.toolCalls.find(tc => tc.id === part.callId)
      if (toolCall) {
        toolCall.state = 'completed'
        toolCall.output = part.result
      }
      break
      
    case 'tool-error':
      const failedCall = message.toolCalls.find(tc => tc.id === part.callId)
      if (failedCall) {
        failedCall.state = 'errored'
        failedCall.error = part.error
      }
      break
  }
  
  // Trigger re-render
  store.notify(sessionId)
}
```
