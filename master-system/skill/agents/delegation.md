# Sub-Agent Delegation Patterns

## Overview

Sub-agents are implemented as child sessions, not in-memory child workers. This ensures:
- Isolation: Each sub-agent runs independently
- Durability: Sub-agent work survives restarts
- Auditability: Full transcript in database
- Resource Limits: Sub-agents have bounded permissions and context

## Delegation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Parent Session                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Agent Loop                                       │   │
│  │   → Calls task tool                              │   │
│  │   → Creates child session                        │   │
│  │   → Waits for completion                        │   │
│  │   → Merges result into transcript               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ spawns
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Child Session                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Own Agent Loop                                   │   │
│  │   → Runs with reduced permissions                │   │
│  │   → Has access to parent's context              │   │
│  │   → Produces summary                            │   │
│  └─────────────────────────────────────────────────┘   │
│  parent_id = parent_session_id                          │
└─────────────────────────────────────────────────────────┘
```

## Child Session Creation

```typescript
interface SpawnChildOptions {
  agent: string           // Agent type (general, explore, etc.)
  parentId: string        // Parent session ID
  context?: string        // Initial context/prompt
  directory?: string     // Override directory (inherit if not set)
  permissions?: PermissionRule[]  // Override permissions
}

async function spawnChild(
  ctx: SessionCtx,
  options: SpawnChildOptions
): Promise<ChildSession> {
  // Validate agent is delegatable
  if (!canDelegateTo(ctx.session.agent, options.agent)) {
    throw new Error(`Cannot delegate to ${options.agent}`)
  }
  
  // Create child session
  const child = await ctx.session.create({
    project_id: ctx.session.projectId,
    parent_id: options.parentId,
    directory: options.directory || ctx.session.directory,
    agent: options.agent,
    model: ctx.session.model,
    permission_mode: 'restricted',
  })
  
  // Apply reduced permissions
  const reducedPermissions = applyPermissionReduction(
    ctx.session.permissions,
    options.agent
  )
  await child.setPermissions(reducedPermissions)
  
  // Copy instruction context if provided
  if (options.context) {
    await child.setContext(options.context)
  }
  
  // Emit child created event
  ctx.sync.emit({
    type: 'session.created',
    session: child,
    parent_id: options.parentId,
  })
  
  return child
}
```

## Permission Inheritance

```typescript
function applyPermissionReduction(
  parentPermissions: PermissionMap,
  childAgent: string
): PermissionMap {
  const reduced = { ...parentPermissions }
  
  // Default reductions for sub-agents
  const defaultDeny = ['task', 'todowrite']
  
  if (childAgent === 'general') {
    // Remove delegation tools unless explicitly re-enabled
    for (const tool of defaultDeny) {
      if (reduced[tool] === 'allow') {
        reduced[tool] = 'ask'
      }
    }
  }
  
  if (childAgent === 'explore') {
    // All write tools denied
    reduced.edit = 'deny'
    reduced.write = 'deny'
    reduced.apply_patch = 'deny'
    reduced.bash = 'deny'
  }
  
  return reduced
}
```

## Context Sharing

```typescript
async function shareContext(
  parent: SessionCtx,
  child: ChildSession
): Promise<void> {
  // Get relevant context from parent
  const messages = await parent.session.getMessages({
    limit: 20,  // Last 20 messages
  })
  
  // Extract key information
  const context = {
    // Recent file edits
    recentEdits: messages
      .filter(m => m.parts.some(p => p.type === 'tool' && p.name === 'edit'))
      .slice(-5),
    
    // Current task state (from todowrite)
    todoItems: await parent.session.getTodo(),
    
    // Active constraints
    constraints: await getActiveConstraints(parent.session),
    
    // Relevant files mentioned
    mentionedFiles: extractFilePaths(messages),
  }
  
  // Store in child for access
  await child.setSharedContext(context)
}
```

## Task Tool Implementation

```typescript
interface TaskInput {
  agent: string        // Target agent name
  task: string          // Task description
  context?: string      // Optional context
  task_id?: string      // For resuming existing task
}

async function executeTaskTool(
  ctx: ToolCtx,
  input: TaskInput
): Promise<TaskResult> {
  // Resume existing child if task_id provided
  if (input.task_id) {
    const child = await ctx.session.getChild(input.task_id)
    
    if (!child) {
      throw new Error(`Task ${input.task_id} not found`)
    }
    
    // Continue existing task
    await child.resume(input.task)
    const result = await child.waitForCompletion()
    
    return {
      task_id: child.id,
      result: result.summary,
      status: result.error ? 'error' : 'completed',
    }
  }
  
  // Create new child session
  const child = await spawnChild(ctx, {
    agent: input.agent,
    parentId: ctx.session.id,
    context: input.context,
  })
  
  // Run the task
  await child.run(input.task)
  
  // Wait for completion
  const result = await child.waitForCompletion()
  
  // Return result to parent
  return {
    task_id: child.id,
    result: result.summary,
    status: result.error ? 'error' : 'completed',
  }
}
```

## Result Merging

```typescript
async function mergeChildResult(
  parent: SessionCtx,
  child: ChildSession,
  taskCallId: string
): Promise<void> {
  // Get child's final state
  const result = await child.getResult()
  
  // Format result for parent context
  const formattedResult = {
    task_id: child.id,
    result: result.summary,
    status: result.error ? 'error' : 'completed',
    agent: child.agent,
    duration_ms: result.durationMs,
    tools_used: result.toolsUsed,
  }
  
  // Find the task tool call in parent
  const parentMessage = await parent.session.getLastMessage()
  const taskCall = parentMessage.parts.find(
    p => p.type === 'tool' && p.id === taskCallId
  )
  
  // Update with result
  if (taskCall) {
    await parent.session.updatePart(taskCall.id, {
      output: formattedResult,
      state: result.error ? 'errored' : 'completed',
    })
  }
  
  // Emit event for UI update
  parent.sync.emit({
    type: 'task.completed',
    taskId: child.id,
    parentSessionId: parent.session.id,
  })
}
```

## Slash Command Delegation

When a user types `/agent-name <task>`, the system creates a subtask:

```typescript
function handleSlashCommand(
  command: string,
  input: string
): SubtaskPart | UserMessage {
  // Parse /agent-name pattern
  const match = input.match(/^(\/\w+)\s+(.*)$/)
  
  if (!match) {
    return createUserMessage(input)
  }
  
  const [, commandStr, task] = match
  const agentName = commandStr.slice(1)  // Remove leading /
  
  // Validate agent exists and is delegatable
  if (!isValidAgent(agentName) || !canDelegateToCurrent(agentName)) {
    return createUserMessage(input)  // Fall back to normal message
  }
  
  // Create subtask part
  return {
    type: 'subtask',
    agent: agentName,
    prompt: task,
  }
}
```

## Fork Sessions

Forks create independent sessions that share history but diverge:

```typescript
async function forkSession(
  ctx: SessionCtx,
  options: ForkOptions
): Promise<Session> {
  // Create new session
  const fork = await ctx.session.create({
    project_id: ctx.session.projectId,
    directory: ctx.session.directory,
    agent: ctx.session.agent,
    model: ctx.session.model,
    title: options.title,
  })
  
  // Copy messages up to current point
  const messages = await ctx.session.getMessages()
  await fork.copyMessages(messages)
  
  // Set status to idle (ready for new work)
  await fork.setStatus('idle')
  
  return fork
}
```

## Delegation Rules Summary

| Parent Agent | Can Delegate To | Notes |
|--------------|-----------------|-------|
| build | general, explore, plan | Full delegation |
| plan | explore | Only read-only |
| general | - | Unless config enables |
| explore | - | Never |
| internal | - | Never |

## Isolation Guarantees

1. **Process Isolation**: Child runs in separate process/worker
2. **Permission Isolation**: Reduced permission set enforced
3. **Context Isolation**: Only shared context explicitly passed
4. **Storage Isolation**: Separate session in database
5. **State Isolation**: No shared in-memory state
