# Multi-Agent Orchestration Patterns

## Parent-Child Pattern

Parent creates child, waits for completion, merges result:

```typescript
async function delegateTask(ctx, agent, task) {
  const child = await spawnChild(ctx, { agent })
  await child.run(task)
  const result = await child.waitForCompletion()
  return result.summary
}
```

## Coordinator Pattern

Coordinator dispatches multiple workers:

```typescript
async function coordinate(ctx, tasks) {
  const workers = tasks.map(task => spawnChild(ctx, 'general'))
  await Promise.all(workers.map(w => w.run(task)))
  return workers.map(w => w.getResult())
}
```

## Pipeline Pattern

Chain agents where output feeds next:

```typescript
async function pipeline(ctx, stages) {
  let context = initialInput
  for (const agent of stages) {
    const child = await spawnChild(ctx, agent)
    await child.run(context)
    const result = await child.waitForCompletion()
    context = result.output
  }
  return context
}
```
