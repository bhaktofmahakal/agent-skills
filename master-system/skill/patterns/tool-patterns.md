# Tool Patterns

## Tool Builder Pattern

Use `buildTool` to create tools with sensible defaults:

```typescript
function buildTool<D extends ToolDef>(def: D): Tool {
  return {
    // Default implementations
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    isDestructive: () => false,
    checkPermissions: async () => ({ behavior: 'allow' }),
    toAutoClassifierInput: () => '',
    userFacingName: () => def.name,
    ...def,
  }
}
```

## Progress Reporting Pattern

For long-running tools, emit progress events:

```typescript
async function executeWithProgress(
  ctx: ToolUseContext,
  onProgress: (progress: number) => void
): Promise<Result> {
  onProgress(0)
  // ... first phase
  onProgress(50)
  // ... second phase  
  onProgress(100)
  return result
}
```

## Permission Pattern

Tools should implement `checkPermissions` for tool-specific logic:

```typescript
checkPermissions: async (input, context) => {
  // Tool-specific checks
  if (input.path.startsWith('/etc') && !context.isAdmin) {
    return { behavior: 'deny' }
  }
  return { behavior: 'allow' }
}
```

## Context Modifier Pattern

Tools can modify the tool context for subsequent tools:

```typescript
execute: async (input, context) => {
  return {
    data: result,
    contextModifier: (ctx) => ({
      ...ctx,
      additionalWorkingDirectories: new Map([
        ...ctx.additionalWorkingDirectories,
        [input.path]: { root: input.path }
      ])
    })
  }
}
```
