# Skill: Agent Builder for Claude Code / OpenCode

This skill guides developers in building custom agents for the Claude Code / OpenCode platform. It covers agent definitions, tool bindings, permission systems, and runtime integration.

## When To Use This Skill

Use this skill when you need to:
- Create custom agents with specific capabilities
- Define tool permissions and access patterns
- Build agent runtime configurations
- Implement agent delegation hierarchies
- Configure agent behavior and termination conditions

## Agent Definition Fundamentals

### Core Agent Contract

Every agent must implement the `AgentDefinition` interface:

```typescript
interface AgentDefinition {
  name: string           // Unique identifier
  description: string    // Display text for UI
  mode: 'primary' | 'subagent' | 'internal'
  model?: {
    providerID: string  // e.g., 'anthropic'
    modelID: string      // e.g., 'claude-sonnet-4-20250514'
  }
  temperature: number    // 0.0 - 1.0
  maxSteps: number      // Max turns before stop
  tools: string[]       // Allowed tool names
  permissions: PermissionRule[]
  prompt: string        // System prompt template
  visible: boolean      // Show in agent selector
}
```

### Agent Modes

| Mode | Purpose | Capabilities |
|------|---------|--------------|
| `primary` | Main user interaction | Full tool access, can delegate |
| `subagent` | Delegated tasks | Limited permissions, reports to parent |
| `internal` | System operations | No tools, always available |

## Building Custom Agents

### Step 1: Define Agent Metadata

```typescript
const myAgent: AgentDefinition = {
  name: 'my-agent',
  description: 'Custom agent for specific tasks',
  mode: 'primary',
  temperature: 0.7,
  maxSteps: 30,
  visible: true,
};
```

### Step 2: Configure Tools

```typescript
// Include specific tools
tools: ['read', 'glob', 'grep', 'edit', 'write', 'bash']

// Or use preset tool groups
tools: ALL_BUILTIN_TOOLS
tools: READ_ONLY_TOOLS
```

### Step 3: Set Permissions

```typescript
permissions: {
  bash: 'ask',      // Prompt before execution
  edit: 'allow',   // Always allow
  write: 'deny',   // Never allow
  webfetch: 'ask',
  mcp: 'deny',     // Block MCP tools
}
```

Permission levels:
- `allow`: Execute without prompt
- `ask`: Require user confirmation
- `deny`: Block execution

### Step 4: Write System Prompt

```typescript
prompt: `You are a specialized agent.
Focus on your specific domain.
Follow best practices for your task type.
Report results clearly to the parent agent if delegated.`
```

## Tool Integration

### Built-in Tools

| Tool | Purpose |
|------|---------|
| `read` | Read file contents |
| `glob` | Find files by pattern |
| `grep` | Search file contents |
| `edit` | Modify existing files |
| `write` | Create new files |
| `bash` | Execute shell commands |
| `task` | Delegate to sub-agents |
| `todowrite` | Track task progress |
| `question` | Ask user clarification |
| `skill` | Load specialized skills |
| `websearch` | Search the web |
| `webfetch` | Fetch web content |
| `codesearch` | Search code APIs |
| `mcp` | Use MCP tools |

### Custom Tool Creation

```typescript
interface ToolDefinition {
  name: string
  description: string
  inputSchema: zod.ZodType
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>
}
```

## Agent Delegation Patterns

### Parent → Sub-agent Flow

```typescript
// Primary agent delegates to sub-agent
{
  name: 'build',
  tools: [...DEFAULT_TOOLS, 'task'],
  prompt: `Delegate research tasks to explore agent.`
}

// Sub-agent definition
{
  name: 'explore',
  mode: 'subagent',
  permissions: INHERIT_THEN_DENY(['edit', 'write', 'bash']),
  prompt: `Investigate and report findings.`
}
```

### Delegation Rules

- Primary agents can delegate to sub-agents
- Sub-agents cannot further delegate (unless enabled)
- Internal agents never delegate

## Agent Lifecycle

### Initialization

1. Load agent definition from config or built-in
2. Apply user config overrides
3. Initialize tool registry with permissions
4. Set up conversation context

### Execution Loop

```
1. Receive user message
2. Select appropriate agent
3. Execute agent prompt loop:
   a. Send prompt + context to LLM
   b. Receive tool calls
   c. Filter by permissions
   d. Execute tools
   e. Collect results
   f. Check termination conditions
4. Return response to user
```

### Termination Conditions

```typescript
interface TerminationCheck {
  taskComplete: boolean      // User outcome achieved
  userBlocked: boolean       // Waiting for user input
  budgetExhausted: number     // Steps/retries exceeded
  doomLoop: boolean          // Repetitive failure detected
  timeout: number            // Time limit reached
}
```

## Configuration File Format

### YAML Agent Config

```yaml
agents:
  - name: my-agent
    description: Custom implementation agent
    mode: primary
    temperature: 0.7
    maxSteps: 50
    visible: true
    tools:
      - read
      - glob
      - grep
      - edit
      - write
      - bash
      - task
    permissions:
      bash: ask
      edit: ask
      write: ask
      task: allow
```

### JSON Agent Config

```json
{
  "agents": [
    {
      "name": "research-agent",
      "description": "Research and analysis agent",
      "mode": "subagent",
      "maxSteps": 20,
      "tools": ["read", "glob", "grep", "codesearch"],
      "permissions": {
        "edit": "deny",
        "write": "deny",
        "bash": "deny"
      }
    }
  ]
}
```

## Best Practices

1. **Start with built-in agents** - Use `build`, `plan`, `explore` as templates
2. **最小権限の原則** - Grant only necessary permissions
3. **明確なTermination Conditions** - Define when agent should stop
4. **構造化prompt** - Use clear role definition and examples
5. **テスト** - Validate agent behavior with specific test cases

## Validation Checklist

Before deploying custom agent:

- [ ] Name is unique and lowercase
- [ ] Description is concise (< 100 chars)
- [ ] Mode is correctly set
- [ ] Tools list is complete and necessary
- [ ] Permissions are properly configured
- [ ] Prompt clearly defines agent role
- [ ] Termination conditions are explicit
- [ ] Agent is tested in isolation
- [ ] Documentation is updated

## Examples

### Code Review Agent

```typescript
{
  name: 'review',
  description: 'Review code for issues',
  mode: 'subagent',
  maxSteps: 15,
  tools: ['read', 'glob', 'grep'],
  permissions: {
    edit: 'deny',
    write: 'deny',
    bash: 'deny',
  },
  prompt: `You are a code review agent.
Analyze the provided code for:
- Security vulnerabilities
- Performance issues
- Code style violations
- Best practice violations
Report findings with file:line references.`
}
```

### Database Agent

```typescript
{
  name: 'db-agent',
  description: 'Database operations specialist',
  mode: 'primary',
  maxSteps: 25,
  tools: ['read', 'glob', 'grep', 'bash'],
  permissions: {
    bash: 'ask',
    edit: 'ask',
    write: 'ask',
  },
  prompt: `You are a database agent.
Specialize in SQL, migrations, and database design.
Help with:
- Writing queries
- Designing schemas
- Debugging performance issues
- Migration scripts`
}
```