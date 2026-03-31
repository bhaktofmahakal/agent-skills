# Agent Execution Flow

```
1. Load agent config
   ↓
2. Build system prompt
   ↓
3. Get message history
   ↓
4. Get available tools
   ↓
5. Create assistant message
   ↓
6. Call model
   ↓
7. Process stream (text, reasoning, tools)
   ↓
8. Execute tools
   ↓
9. Loop until no pending tools
   ↓
10. Mark session idle
```
