# Agent Decision Logic

## Tool Selection Decision Tree

When an agent needs to perform an action, it should select tools in this priority order:

### 1. Repository Facts - Read Operations
```
Need to understand code structure or file contents?
    ↓
Use read, glob, grep, codesearch, or skill
```

| Tool | Use Case |
|------|----------|
| `read` | Get file contents |
| `glob` | Find files by pattern |
| `grep` | Search text in files |
| `codesearch` | Search code indexes |
| `skill` | Load skill definitions |

### 2. User Information - Questions
```
Need information only the user can provide?
    ↓
Use question tool
```

### 3. Shell Execution
```
Need to run commands, compile, test, or use CLI tools?
    ↓
Use bash tool
```

### 4. Code Modification
```
Need to modify code?
    ↓
    ├─ Model supports patches?
    │   ↓
    │   Use apply_patch
    │
    ├─ Targeted replacement (existing file)?
    │   ↓
    │   Use edit
    │
    └─ New file or full replacement?
        ↓
        Use write
```

### 5. Parallel Work
```
Need to delegate work to another agent?
    ↓
Use task tool (only if agent allows delegation)
```

### 6. Browser/Network
```
Need external information from web?
    ↓
    ├─ Specific URL?
    │   ↓
    │   Use webfetch
    │
    └─ Search query?
        ↓
        Use websearch
```

### 7. Planning Visibility
```
Need to track task progress?
    ↓
Use todowrite tool
```

## Agent Selection

### Determining Which Agent to Use

```
User submits prompt
    ↓
Check for explicit agent (/agent-name or --agent flag)
    ↓
No explicit agent?
    ↓
    Check session history for previous agent
    ↓
    First session?
        ↓
        Use default agent (build)
    ↓
    Check prompt for agent mention (@agent-name)
    ↓
    No mention?
        ↓
        Use build agent
```

### Agent Capability Mapping

| Agent | Primary Tools | Restricted Tools |
|-------|---------------|-------------------|
| build | All built-in | - |
| plan | read, glob, grep, question, todowrite, skill, websearch | edit, write, bash, task |
| general | Inherited from parent | task, todowrite (unless enabled) |
| explore | read, glob, grep, question, websearch, codesearch | edit, write, bash, task, webfetch |

## Permission Decision Flow

```
Tool execution requested
    ↓
Get tool permission name
    ↓
Get input for pattern matching
    ↓
Evaluate rules in order:
    1. Session-specific rules
    2. Project-level rules  
    3. User global rules
    4. Agent default rules
    ↓
Match found?
    ↓
    Yes → Use matched action
    No → Use agent default
    ↓
Action = allow → Execute
Action = ask → Prompt user, pause
Action = deny → Error
```

## Model/Provider Selection

### Default Model Selection
```
Agent has explicit model setting?
    ↓
    Yes → Use agent's model
    No → Check provider config
        ↓
        Default provider configured?
        ↓
        Yes → Use default model for provider
        No → Use fallback model
```

### Patch-Capable Model Detection
```
Tool = apply_patch requested
    ↓
Check model capability flag
    ↓
Model is patch-capable?
    ↓
    Yes → Enable apply_patch, disable edit/write
    No → Disable apply_patch, enable edit/write
```

### Network Tool Availability
```
Tool = websearch or codesearch
    ↓
Check provider credentials
    ↓
Credentials configured?
    ↓
    Yes → Enable tool
    No → Disable tool with provider_unconfigured error
```

## Structured Output Mode

### Triggering Structured Output
```
User message includes format: { schema }
    ↓
Inject synthetic StructuredOutput tool
    ↓
Add to tool list for model
    ↓
Require exactly one successful call
    ↓
Validate output against schema
    ↓
Store validated output on message
    ↓
Terminate loop immediately
```

### Schema Validation Flow
```
Model calls StructuredOutput tool
    ↓
Tool returns JSON object
    ↓
Validate against user-provided schema
    ↓
Valid?
    ↓
    Yes → Store as structured_output
          Terminate loop
    No → Return validation error
          Continue loop
```

## Mode Switching

### Plan Mode Activation
```
User types /plan or --plan
    ↓
Detect plan mode trigger
    ↓
Switch agent to 'plan'
    ↓
Apply plan permissions (deny edit/write)
    ↓
Inject plan reminder in system prompt
    ↓
Execute in plan mode
```

### Plan Mode Exit
```
User types exit, continues, or sends new message
    ↓
Detect plan mode exit
    ↓
Restore previous agent
    ↓
Restore previous permissions
    ↓
Continue in normal mode
```

## Doom Loop Detection

```
Tool call received
    ↓
Normalize tool name and input
    ↓
Compare to previous calls
    ↓
Same tool + same input 3x in row?
    ↓
    Yes → Trigger doom loop handling
          Stop execution
          Emit error part
          Set status to waiting_question
          Require user input to continue
    No → Execute tool normally
```
