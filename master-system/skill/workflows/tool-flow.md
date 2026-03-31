# Tool Call Lifecycle

```
1. Model calls tool
   ↓
2. Validate tool exists and input
   ↓
3. Check permission
   ↓
4. Emit tool.started event
   ↓
5. Execute tool
   ↓
6. Normalize output
   ↓
7. Store result part
   ↓
8. Emit tool.finished event
   ↓
9. Return to model loop
```
