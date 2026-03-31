# Retry Logic

## Retryable Errors

- Network interruption
- Provider 429 (rate limit)
- Provider timeout
- MCP transport outage

## Retry Schedule

```
Attempt 1: Immediate
Attempt 2: 500ms
Attempt 3: 1s
Attempt 4: 2s

Stop after 4 attempts
```

## Implementation

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 4
): Promise<T> {
  const delays = [0, 500, 1000, 2000]
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetryable(error) || i === maxAttempts - 1) {
        throw error
      }
      await sleep(delays[i])
    }
  }
}
```
