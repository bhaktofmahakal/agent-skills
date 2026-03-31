# Multi-Agent Orchestration

```
1. Parent agent calls task tool
   ↓
2. Task tool creates child session
   ↓
3. Child runs with reduced permissions
   ↓
4. Child completes
   ↓
5. Parent receives result in task result
   ↓
6. Parent continues with result as context
```

## Child Session Result

```typescript
interface TaskResult {
  task_id: string
  result: string
  status: 'completed' | 'error'
}
```
