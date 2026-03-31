# Session Management

## Session Model

```typescript
interface Session {
  id: string
  projectId: string
  workspaceId: string | null
  directory: string
  parentId: string | null  // For child sessions
  title: string | null
  summary: string | null
  agent: string
  model: string | null
  status: SessionStatus
  permissionMode: PermissionMode
  revertState: string | null
  shareToken: string | null
  archived: boolean
  createdAt: number
  updatedAt: number
}
```

## Session Creation

```typescript
async function createSession(
  ctx: ProjectInstance,
  options: CreateSessionOptions
): Promise<Session> {
  const session: Session = {
    id: generateId(),
    projectId: ctx.project.id,
    workspaceId: options.workspaceId,
    directory: options.directory || ctx.directory,
    parentId: options.parentId,
    title: options.title || null,
    summary: null,
    agent: options.agent || 'build',
    model: options.model || null,
    status: 'idle',
    permissionMode: 'default',
    revertState: null,
    shareToken: null,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  await ctx.storage.insert('session', session)
  
  // Emit event
  ctx.sync.emit({
    type: 'session.created',
    session,
  })
  
  return session
}
```

## Session Status Management

```typescript
async function setSessionStatus(
  ctx: SessionCtx,
  status: SessionStatus
): Promise<void> {
  await ctx.storage.update('session', ctx.session.id, {
    status,
    updated_at: Date.now(),
  })
  
  ctx.sync.emit({
    type: 'session.updated',
    sessionId: ctx.session.id,
    status,
  })
}
```

## Child Session Management

```typescript
async function spawnChildSession(
  ctx: SessionCtx,
  options: SpawnOptions
): Promise<Session> {
  // Create child with inherited context
  const child = await createSession(ctx, {
    parentId: ctx.session.id,
    directory: options.directory,
    agent: options.agent,
    model: ctx.session.model,
  })
  
  // Set reduced permissions
  const permissions = applyPermissionReduction(
    ctx.session.getPermissions(),
    options.agent
  )
  await child.setPermissions(permissions)
  
  // Copy active context
  if (options.context) {
    await child.setContext(options.context)
  }
  
  return child
}
```

## Session Forking

```typescript
async function forkSession(
  ctx: SessionCtx,
  newTitle?: string
): Promise<Session> {
  // Create new session
  const fork = await createSession(ctx, {
    title: newTitle,
  })
  
  // Copy messages
  const messages = await ctx.session.getMessages()
  await fork.copyMessages(messages)
  
  return fork
}
```

## Session Persistence

- All session metadata in SQLite
- Messages stored with parts
- Runtime state (current step, pending calls) kept in memory
- On restart, running sessions marked as `interrupted`
