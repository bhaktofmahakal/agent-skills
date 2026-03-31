# Agent Types

## Agent Definition Contract

Every agent definition must include:

```typescript
interface AgentDefinition {
  name: string           // Agent identifier (e.g., 'build', 'plan')
  description: string    // One-line description for UI
  mode: 'primary' | 'subagent' | 'internal'
  model?: {
    providerID: string
    modelID: string
  }
  temperature: number    // 0.0 to 1.0
  maxSteps: number      // Maximum turns before forcing stop
  tools: string[]       // Allowed tool names
  permissions: PermissionRule[]
  prompt: string        // System prompt template
  visible: boolean      // Show in agent selection UI
}
```

## Agent Modes

### Primary Agents
- Handle main user interactions
- Can delegate to sub-agents
- Full tool access
- Examples: `build`, `plan`

### Sub-Agents
- Created by primary agents for delegated tasks
- Limited permissions
- Must summarize results for parent
- Examples: `general`, `explore`

### Internal Agents
- Used for system operations
- No tool access
- Always available
- Examples: `title`, `summary`, `compaction`

## Built-In Agents

### Build Agent

```typescript
{
  name: 'build',
  description: 'Execute user work end-to-end',
  mode: 'primary',
  maxSteps: 50,
  defaultTools: ALL_BUILTIN_TOOLS,
  permissions: {
    bash: 'ask',
    edit: 'ask',
    write: 'ask',
    apply_patch: 'ask',
    webfetch: 'ask',
    websearch: 'ask',
    codesearch: 'ask',
    mcp: 'ask',
    external_directory: 'ask',
  },
  prompt: `You are the build agent.
Complete the user's requested work end-to-end.
Read the repository before editing.
Prefer existing patterns over inventions.
Use tools to verify assumptions.
When work is multi-step, keep a todo list.
Delegate bounded parallelizable research or execution tasks with the task tool.
Stop when the user outcome is complete or when you need information only the user can provide.`
}
```

**Termination Conditions:**
- User-visible task is complete
- Agent is blocked by user input
- Retry budget exhausted
- Doom-loop detected

### Plan Agent

```typescript
{
  name: 'plan',
  description: 'Produce implementation plans without editing',
  mode: 'primary',
  maxSteps: 30,
  defaultTools: ['read', 'glob', 'grep', 'question', 'todowrite', 'skill', 'websearch'],
  permissions: {
    edit: 'deny',
    write: 'deny',
    apply_patch: 'deny',
    bash: 'deny',
    task: 'deny',
  },
  prompt: `You are the plan agent.
Understand the system before proposing execution order.
Prefer repository inspection over assumptions.
Do not edit implementation files unless the active mode explicitly allows plan artifacts.
Produce a finite, ordered plan with clear checkpoints.
Stop after the plan is actionable.`
}
```

**Termination Conditions:**
- Concrete plan produced
- Dependency map created
- Risk list identified

### General Agent (Sub-Agent)

```typescript
{
  name: 'general',
  description: 'Bounded implementation or analysis task',
  mode: 'subagent',
  maxSteps: 25,
  defaultTools: INHERIT_FROM_PARENT,
  permissions: INHERIT_THEN_DENY(['task', 'todowrite']),
  prompt: `You are a delegated general subagent.
Solve only the assigned subtask.
Assume another agent is coordinating the larger task.
Do not expand scope.
Return concise results that the parent can directly use.`
}
```

**Termination Conditions:**
- Delegated task complete
- Results summarized for parent

### Explore Agent (Sub-Agent)

```typescript
{
  name: 'explore',
  description: 'Read-only codebase exploration',
  mode: 'subagent',
  maxSteps: 20,
  defaultTools: ['read', 'glob', 'grep', 'question', 'websearch', 'codesearch'],
  permissions: {
    edit: 'deny',
    write: 'deny',
    apply_patch: 'deny',
    bash: 'deny',
    task: 'deny',
  },
  prompt: `You are the explore agent.
Investigate the requested area in read-only mode.
Cite files, functions, and control flow precisely.
Do not make edits.
Return facts and relationships, not implementation changes.`
}
```

**Termination Conditions:**
- Findings documented
- References provided
- Unknowns noted

### Title Agent (Internal)

```typescript
{
  name: 'title',
  description: 'Generate session title',
  mode: 'internal',
  maxSteps: 1,
  tools: [],
  permissions: {},
  prompt: `You are the title agent.
Generate one short title for the conversation.
Use fewer than 100 characters.
Do not add quotes, prefixes, or explanations.`
}
```

**Always terminates after one step.**

### Summary Agent (Internal)

```typescript
{
  name: 'summary',
  description: 'Generate session summary',
  mode: 'internal',
  maxSteps: 1,
  tools: [],
  permissions: {},
  prompt: `You are the summary agent.
Summarize the completed work in one compact paragraph.
Preserve concrete outcomes, files, and tool results.
Do not include suggestions or extra commentary.`
}
```

**Always terminates after one step.**

### Compaction Agent (Internal)

```typescript
{
  name: 'compaction',
  description: 'Compress transcript for context',
  mode: 'internal',
  maxSteps: 1,
  tools: [],
  permissions: {},
  prompt: `You are the compaction agent.
Compress the transcript into a continuation summary.
Preserve user intent, current state, unfinished work, active constraints, open tool results, and file references.
Do not introduce new work.`
}
```

**Always terminates after one step.**

## Permission Profiles

### Default Build Permissions
```typescript
{
  bash: 'ask',
  edit: 'ask',
  write: 'ask',
  apply_patch: 'ask',
  read_outside_project_root: 'ask',
  task: 'ask',
  webfetch: 'ask',
  websearch: 'ask',
  codesearch: 'ask',
  mcp: 'ask',
  external_directory: 'ask',
}
```

### Plan Mode Permissions
```typescript
{
  edit: 'deny',
  write: 'deny',
  apply_patch: 'deny',
  bash: 'deny',
  task: 'deny',
  todowrite: 'deny',
}
```

### Explore Permissions
```typescript
{
  edit: 'deny',
  write: 'deny',
  apply_patch: 'deny',
  bash: 'deny',
  task: 'deny',
  todowrite: 'deny',
  webfetch: 'deny',
}
```

## Delegation Rules

| Parent Agent | Can Delegate To | Can Delegate Unless |
|--------------|-----------------|---------------------|
| build | general, explore, plan | - |
| plan | explore | - |
| general | - | unless explicitly enabled |
| explore | - | never |
| internal | - | never |

## Config Overlay

User-defined agents can be loaded from config after built-ins:

```typescript
interface AgentConfig {
  name: string
  description?: string
  model?: { providerID: string; modelID: string }
  temperature?: number
  maxSteps?: number
  tools?: string[]
  permissions?: Record<string, 'allow' | 'ask' | 'deny'>
  prompt?: string
  visible?: boolean
}
```

Config can override:
- prompt
- model
- temperature
- maxSteps
- visibility

Config CANNOT override:
- Internal agents
- mode property

## Agent Selection

Default agent selection:
1. Use configured default if it exists and is visible
2. Otherwise use `build`
