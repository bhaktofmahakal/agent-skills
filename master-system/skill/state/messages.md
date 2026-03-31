# Message and Part Storage

## Message Model

```typescript
interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  format: string | null      // For structured output
  structuredOutput: unknown | null
  errorCode: string | null
  createdAt: number
  updatedAt: number
}
```

## Message Part Types

```typescript
type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'file'; path: string; text: string }
  | { type: 'tool'; name: string; state: 'running' | 'completed' | 'errored'; input: unknown; output?: unknown; error?: string; callId?: string }
  | { type: 'patch'; path: string; diff: string }
  | { type: 'snapshot'; value: unknown }
  | { type: 'agent'; name: string }
  | { type: 'subtask'; agent: string; task: string; taskId?: string }
  | { type: 'compaction'; summary: string }
  | { type: 'retry'; attempt: number; error: string }
  | { type: 'step_start'; step: number }
  | { type: 'step_finish'; step: number }
  | { type: 'error'; code: string; message: string }
```

## Message Creation

```typescript
async function createMessage(
  ctx: SessionCtx,
  options: CreateMessageOptions
): Promise<Message> {
  const message: Message = {
    id: generateId(),
    sessionId: ctx.session.id,
    role: options.role,
    format: options.format || null,
    structuredOutput: null,
    errorCode: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  await ctx.storage.insert('message', message)
  
  ctx.sync.emit({
    type: 'message.created',
    sessionId: ctx.session.id,
    messageId: message.id,
  })
  
  return message
}
```

## Part Appending

```typescript
async function appendPart(
  ctx: SessionCtx,
  messageId: string,
  part: MessagePart
): Promise<MessagePart> {
  const existingParts = await ctx.storage.query('message_part', {
    message_id: messageId,
  })
  
  const partRow = {
    id: generateId(),
    message_id: messageId,
    type: part.type,
    order_index: existingParts.length,
    status: part.type === 'tool' ? part.state : null,
    payload_json: JSON.stringify(part),
    created_at: Date.now(),
    updated_at: Date.now(),
  }
  
  await ctx.storage.insert('message_part', partRow)
  
  ctx.sync.emit({
    type: 'message.part.updated',
    sessionId: ctx.session.id,
    messageId,
    part,
  })
  
  return part
}
```

## Message Retrieval

```typescript
async function getMessages(
  ctx: SessionCtx,
  options: GetMessagesOptions = {}
): Promise<Message[]> {
  const { cursor, limit = 50 } = options
  
  let query = ctx.storage.query('message', {
    session_id: ctx.session.id,
  })
  
  if (cursor) {
    query = query.where('id < ?', cursor)
  }
  
  const messages = await query.order('created_at', 'desc').limit(limit)
  
  // Load parts for each message
  for (const msg of messages) {
    msg.parts = await getParts(ctx, msg.id)
  }
  
  return messages.reverse()  // Oldest first
}
```
