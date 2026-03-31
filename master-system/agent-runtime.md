# AGENT RUNTIME SPECIFICATION

This document defines the complete agent runtime system.

---

## 1. AGENT TYPES AND MODES

### Agent Mode Classification

```
primary    → Main user interaction, can delegate
subagent   → Delegated task, limited permissions
internal   → System operations, no tools
```

### Built-In Agents

#### Build Agent (Primary)
```typescript
{
  name: 'build',
  description: 'Execute user work end-to-end',
  mode: 'primary',
  maxSteps: 50,
  tools: ALL_BUILTIN,
  permissions: {
    bash: 'ask', edit: 'ask', write: 'ask', apply_patch: 'ask',
    webfetch: 'ask', websearch: 'ask', codesearch: 'ask',
    mcp: 'ask', external_directory: 'ask'
  },
  prompt: `You are the build agent.
Complete the user's requested work end-to-end.
Read the repository before editing.
Prefer existing patterns over inventions.
Use tools to verify assumptions.
When work is multi-step, keep a todo list.
Delegate bounded parallelizable research with the task tool.
Stop when the user outcome is complete or when you need information only the user can provide.`,
  visible: true
}
```

#### Plan Agent (Primary)
```typescript
{
  name: 'plan',
  description: 'Produce implementation plans without editing',
  mode: 'primary',
  maxSteps: 30,
  tools: ['read', 'glob', 'grep', 'question', 'todowrite', 'skill', 'websearch'],
  permissions: { edit: 'deny', write: 'deny', apply_patch: 'deny', bash: 'deny', task: 'deny' },
  prompt: `You are the plan agent.
Understand the system before proposing execution order.
Prefer repository inspection over assumptions.
Do not edit implementation files unless the active mode explicitly allows plan artifacts.
Produce a finite, ordered plan with clear checkpoints.
Stop after the plan is actionable.`,
  visible: true
}
```

#### General Agent (Subagent)
```typescript
{
  name: 'general',
  description: 'Bounded implementation or analysis task',
  mode: 'subagent',
  maxSteps: 25,
  tools: INHERIT_FROM_PARENT,
  permissions: { task: 'deny', todowrite: 'deny' },
  prompt: `You are a delegated general subagent.
Solve only the assigned subtask.
Assume another agent is coordinating the larger task.
Do not expand scope.
Return concise results that the parent can directly use.`,
  visible: true
}
```

#### Explore Agent (Subagent)
```typescript
{
  name: 'explore',
  description: 'Read-only codebase exploration',
  mode: 'subagent',
  maxSteps: 20,
  tools: ['read', 'glob', 'grep', 'question', 'websearch', 'codesearch'],
  permissions: { edit: 'deny', write: 'deny', apply_patch: 'deny', bash: 'deny', task: 'deny' },
  prompt: `You are the explore agent.
Investigate the requested area in read-only mode.
Cite files, functions, and control flow precisely.
Do not make edits.
Return facts and relationships, not implementation changes.`,
  visible: true
}
```

#### Title Agent (Internal)
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
Do not add quotes, prefixes, or explanations.`,
  visible: false
}
```

#### Summary Agent (Internal)
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
Do not include suggestions or extra commentary.`,
  visible: false
}
```

#### Compaction Agent (Internal)
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
Do not introduce new work.`,
  visible: false
}
```

---

## 2. DELEGATION RULES

| Parent Agent | Can Delegate To | Cannot Delegate |
|--------------|------------------|------------------|
| build | general, explore, plan | - |
| plan | explore | - |
| general | (unless explicitly enabled) | task, todowrite |
| explore | (never) | any |
| internal | (never) | any |

---

## 3. AGENT SELECTION

1. Use configured default agent if exists AND visible
2. Otherwise use `build`

---

## 4. TOOL SELECTION DECISION TREE

```
Need repository facts?
  → read, glob, grep, codesearch, skill

Need user-only information?
  → question

Need shell execution?
  → bash

Need code modification?
  → apply_patch (for patch-capable models)
  → edit (for targeted replacements)
  → write (for new files or full replacements)

Need parallel sub-work?
  → task

Need browser/network facts?
  → webfetch, websearch

Need plan visibility?
  → todowrite
```

---

## 5. AGENT CONFIG OVERLAY

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

Config CAN override: prompt, model, temperature, maxSteps, visibility
Config CANNOT override: Internal agents, mode property

---

## 6. AGENT SERVICE IMPLEMENTATION

```typescript
class AgentServiceImpl implements AgentService {
  private agents = new Map<string, AgentDefinition>()
  
  constructor() {
    // Load built-in agents
    this.registerBuiltinAgents()
  }
  
  private registerBuiltinAgents() {
    this.agents.set('build', BUILD_AGENT)
    this.agents.set('plan', PLAN_AGENT)
    this.agents.set('general', GENERAL_AGENT)
    this.agents.set('explore', EXPLORE_AGENT)
    this.agents.set('title', TITLE_AGENT)
    this.agents.set('summary', SUMMARY_AGENT)
    this.agents.set('compaction', COMPACTION_AGENT)
  }
  
  get(name: string): AgentDefinition | undefined {
    return this.agents.get(name)
  }
  
  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values())
  }
  
  async run(name: string, input: AgentInput): Promise<AgentOutput> {
    const agent = this.agents.get(name)
    if (!agent) throw new Error(`Unknown agent: ${name}`)
    
    // Run single-step agent (internal agents)
    if (agent.maxSteps === 1) {
      return this.runInternal(agent, input)
    }
    
    throw new Error('Use promptLoop for primary/subagent agents')
  }
  
  async runInternal(agent: AgentDefinition, input: AgentInput): Promise<AgentOutput> {
    // Build request for internal agent
    const request = {
      model: agent.model || DEFAULT_MODEL,
      system: agent.prompt,
      messages: [{ role: 'user', content: input.prompt }],
      tools: [], // Internal agents have no tools
    }
    
    // Stream and collect result
    const stream = await provider.stream(request)
    let result = ''
    
    for await (const event of stream) {
      if (event.type === 'text-delta') {
        result += event.text
      }
    }
    
    return { text: result }
  }
  
  loadConfig(config: AgentConfig[]): void {
    for (const cfg of config) {
      const existing = this.agents.get(cfg.name)
      if (existing && existing.mode === 'internal') continue // Cannot override internal
      
      this.agents.set(cfg.name, {
        ...existing,
        ...cfg,
        mode: existing?.mode || 'subagent', // Default to subagent
      })
    }
  }
}
```

---

This agent runtime specification is COMPLETE and DETERMINISTIC.