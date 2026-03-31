# RELIABILITY SPECIFICATION

This document defines the complete reliability and error handling for the agent platform.

---

## 1. VALIDATION LAYERS

### HTTP Request Validation

```typescript
const PromptRequestSchema = z.object({
  sessionId: z.string(),
  text: z.string(),
  agent: z.string().optional(),
  model: z.object({
    providerID: z.string(),
    modelID: z.string()
  }).optional(),
  format: z.unknown().optional(),
  parts: z.array(MessagePartSchema).optional()
})

app.post('/session/:id/prompt', async (c) => {
  const body = await c.req.json()
  const parsed = PromptRequestSchema.parse(body)  // Throws if invalid
  // ...
})
```

### Tool Input Validation

```typescript
const tool = {
  name: 'read',
  input: z.object({
    path: z.string(),
    start: z.number().optional(),
    end: z.number().optional()
  }),
  execute: async (ctx, input) => {
    // input already validated by registry
  }
}
```

---

## 2. RETRY LOGIC (DETERMINISTIC)

### When to Retry

Only retry transient errors:
- Network interruption
- 429 (rate limit)
- 503 (unavailable)
- Timeout
- MCP transport outage

### Retry Schedule

```
Attempt 1: immediate
Attempt 2: 500ms
Attempt 3: 1s
Attempt 4: 2s
```

### Implementation

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
      if (!isTransientError(error)) throw error
      if (attempt === maxAttempts - 1) throw error
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

## 3. FAILURE HANDLING MATRIX

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Tool throws | Exception | Persist error part, continue |
| Permission deny | Rule = deny | Persist error, stop action |
| Permission ask timeout | No reply within window | Leave in waiting_permission |
| Doom loop | 3x identical tool call | Stop, require user input |
| Provider network reset | Transport error | Apply retry schedule |
| Provider auth failure | 401 response | Normalize as auth error |
| Context overflow | 431 error OR budget > 80% | Run compaction |
| MCP server offline | Transport failure | Mark offline, remove tools |
| MCP OAuth state mismatch | Callback state mismatch | Reject callback |
| Invalid MCP schema | Validation error | Mark invalid, skip tools |
| Child session failure | Child error | Return failed result to parent |
| Server restart | In-memory lost | Mark sessions interrupted |
| Question rejection | User rejects | Raise error to blocked tool |
| PTY reconnect | Client reconnects | Replay from cursor |

---

## 4. SSE RECONNECT (DETERMINISTIC)

```typescript
function connectStream(store: SyncStore) {
  let timer: ReturnType<typeof setTimeout> | undefined
  
  const open = () => {
    const es = new EventSource("/event")
    
    const beat = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        es.close()
        setTimeout(open, 2000)
      }, 25000)
    }
    
    es.onmessage = (evt) => {
      beat()
      store.apply(JSON.parse(evt.data))
    }
    
    es.onerror = () => {
      es.close()
      setTimeout(open, 2000)
    }
    
    beat()
  }
  
  open()
}
```

---

## 5. LIMITS

### Context Limits

- Max tokens per session: configurable (default 200k)
- Compaction trigger: 80% of budget
- Message window: dynamic based on token budget

### Tool Limits

- Max bash timeout: 5 minutes (configurable)
- Max result size: 100KB (truncated with marker)
- Doom loop threshold: 3 identical calls

### Session Limits

- Max steps per agent: configurable (default 50)
- Max concurrent sessions: based on memory
- Session timeout: 24 hours idle

---

This reliability specification is COMPLETE and DETERMINISTIC.