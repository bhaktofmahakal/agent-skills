# User Prompt Flow

## Complete Flow

```
1. User enters prompt in UI
   ↓
2. Client resolves: directory, session, slash commands
   ↓
3. If no session → POST /session (create)
   ↓
4. Insert optimistic user message (client-side)
   ↓
5. POST /session/:id/prompt_async
   ↓
6. Server creates user message
   ↓
7. Server starts prompt loop
   ↓
8. Server streams via SSE
   ↓
9. Client renders parts in real-time
   ↓
10. Loop completes, session idle
```

## Client Implementation

```typescript
async function submitPrompt(
  text: string,
  options: SubmitOptions = {}
): Promise<void> {
  // Get or create session
  let sessionId = options.sessionId
  if (!sessionId) {
    const session = await sdk.createSession()
    sessionId = session.id
  }
  
  // Add optimistic message
  const optimisticId = `temp-${Date.now()}`
  store.addOptimisticMessage(optimisticId, text)
  
  try {
    // Submit prompt
    await sdk.promptAsync(sessionId, {
      text,
      agent: options.agent,
      model: options.model,
    })
    
    // Sync will replace optimistic with real ID
  } catch (error) {
    store.removeOptimisticMessage(optimisticId)
    throw error
  }
}
```
