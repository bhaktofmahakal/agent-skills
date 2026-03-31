# MULTI-AGENT ORCHESTRATION SPECIFICATION

This document defines the complete multi-agent orchestration system.

---

## 1. SUB-AGENT DELEGATION (TASK TOOL)

### Task Tool Interface

```typescript
{
  name: 'task',
  description: 'Delegate to a sub-agent',
  permission: 'task',
  input: z.object({
    agent: z.string(),           // Target agent name
    task: z.string(),           // Task description
    context: z.string().optional(),  // Additional context
    task_id: z.string().optional()   // Resume existing child
  }),
  output: z.object({
    task_id: z.string(),
    result: z.string(),
    status: z.enum(['completed', 'error'])
  })
}
```

---

## 2. CHILD SESSION CREATION

```typescript
async function spawnChild(
  parentId: string,
  agent: string,
  task: string,
  context?: string
): Promise<Session> {
  // Validate delegation allowed
  const parentAgent = getParentAgent(parentId)
  if (!canDelegate(parentAgent, agent)) {
    throw new Error(`Cannot delegate to ${agent} from ${parentAgent}`)
  }
  
  // Create child session
  const child = await sessionService.create({
    projectId: getProjectId(parentId),
    parentId,
    agent,
    directory: getDirectory(parentId),
    permissionMode: getReducedPermissions(parentAgent, agent)
  })
  
  // Store task context
  await sessionService.setContext(child.id, { task, context })
  
  return child
}
```

---

## 3. RESULT MERGING

```typescript
async function mergeChildResult(
  parentId: string,
  childId: string,
  toolCallId: string
): Promise<void> {
  const childResult = await sessionService.getResult(childId)
  
  // Update parent's tool call with child result
  await sessionService.setToolResult(parentId, toolCallId, {
    task_id: childId,
    result: childResult.summary,
    status: childResult.error ? 'error' : 'completed'
  })
  
  // If subtask from slash command, inject follow-up
  if (childResult.fromSlashCommand) {
    await sessionService.addMessage(parentId, {
      role: 'user',
      content: `Subtask complete. Please summarize and continue.`
    })
  }
}
```

---

## 4. COORDINATOR MODE

### When to Use Coordinator

- Multi-part tasks requiring different agents
- Complex workflows with dependencies
- Large-scale refactoring across files

### Coordinator Implementation

```typescript
interface CoordinatorTask {
  description: string
  agents: string[]  // Which agents to use
  dependencies: Map<string, string[]>  // taskId -> depends on taskIds
}

async function orchestrate(task: CoordinatorTask): Promise<CoordinationResult> {
  const children: Map<string, Session> = new Map()
  const results: Map<string, unknown> = new Map()
  
  // Phase 1: Launch independent tasks
  for (const subtask of task.dependencies.get('')) {  // Root tasks
    const agent = getAgentForSubtask(subtask)
    const child = await sessionService.create({
      ...baseSession,
      agent,
      title: subtask
    })
    children.set(subtask, child)
    child.run(getTaskPrompt(subtask))
  }
  
  // Phase 2: Wait and launch dependent tasks
  while (results.size < task.subtasks.length) {
    await sleep(1000)  // Poll interval
    
    for (const [name, child] of children) {
      if (child.isComplete() && !results.has(name)) {
        results.set(name, child.getResult())
        
        // Launch dependent tasks
        const deps = task.dependencies.get(name) || []
        for (const dep of deps) {
          if (children.has(dep)) continue
          // Create dependent task...
        }
      }
    }
  }
  
  // Phase 3: Merge results
  return mergeResults(results)
}
```

---

## 5. SWARM MODE (Multiple Parallel Agents)

```typescript
async function swarmExecute(
  task: string,
  agents: string[]
): Promise<SwarmResult> {
  // Create multiple child sessions in parallel
  const children = await Promise.all(
    agents.map(agent => sessionService.create({ agent, title: task }))
  )
  
  // Run all simultaneously
  await Promise.all(children.map(child => child.run(task)))
  
  // Collect results
  const results = await Promise.all(
    children.map(child => child.getResult())
  )
  
  // Merge into coherent response
  return {
    responses: results.map(r => r.summary),
    metadata: {
      agentCount: agents.length,
      individualResults: results
    }
  }
}
```

---

## 6. DELEGATION RULES MATRIX

| Parent | Can Delegate To | Max Children |
|--------|-----------------|--------------|
| build | general, explore, plan | 5 |
| plan | explore | 2 |
| general | (configurable) | 1 |
| explore | (never) | 0 |
| internal | (never) | 0 |

---

This multi-agent orchestration specification is COMPLETE and DETERMINISTIC.