# Tool Definition Contracts

## Tool Interface Contract

Every tool must conform to this interface:

```typescript
interface Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  Progress extends ToolProgressData = ToolProgressData,
> {
  // Identification
  name: string
  description: string
  permission: string
  
  // Schema validation
  inputSchema: z.ZodType<Input>
  outputSchema?: z.ZodType<Output>
  
  // Capability flags
  isEnabled(): boolean
  isConcurrencySafe(input: Input): boolean
  isReadOnly(input: Input): boolean
  isDestructive?(input: Input): boolean
  
  // Execution
  execute(
    input: Input,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: Message,
    onProgress?: ToolCallProgress<Progress>
  ): Promise<ToolResult<Output>>
  
  // Permission
  checkPermissions?(input: Input, context: ToolUseContext): Promise<PermissionResult>
  
  // Optional hooks
  validateInput?(input: Input, context: ToolUseContext): Promise<ValidationResult>
  preparePermissionMatcher?(input: Input): Promise<(pattern: string) => boolean>
  
  // UI rendering
  renderToolUseMessage(input: Partial<Input>, options: RenderOptions): ReactNode
  renderToolResultMessage?(content: Output, options: RenderOptions): ReactNode
  renderToolUseProgressMessage?(progress: Progress[], options: RenderOptions): ReactNode
  
  // Display helpers
  getActivityDescription?(input: Partial<Input>): string | null
  getToolUseSummary?(input: Partial<Input>): string | null
  extractSearchText?(output: Output): string
}
```

## Tool Context Contract

The context passed to every tool execution:

```typescript
interface ToolUseContext {
  // Session info
  sessionId: string
  projectId: string
  agent: AgentDefinition
  
  // Services
  provider: Provider
  permission: PermissionEngine
  mcp: McpClient
  
  // Runtime
  abort: AbortSignal
  logger: Logger
  
  // Messages
  messages: Message[]
  
  // State access
  getAppState(): AppState
  setAppState(updater: (state: AppState) => AppState): void
  
  // Optional handlers
  setToolJSX?: (jsx: ReactNode | null) => void
  addNotification?: (notification: Notification) => void
  appendSystemMessage?: (message: SystemMessage) => void
  
  // Configuration
  options: {
    commands: Command[]
    debug: boolean
    mainLoopModel: string
    tools: Tool[]
    verbose: boolean
    thinkingConfig: ThinkingConfig
    mcpClients: MCPServerConnection[]
    agentDefinitions: AgentDefinition[]
    maxBudgetUsd?: number
  }
}
```

## Tool Result Contract

All tools must return results conforming to this contract:

```typescript
interface ToolResult<T> {
  data: T
  
  // Optional new messages to inject
  newMessages?: Message[]
  
  // Optional context modifier
  contextModifier?: (context: ToolUseContext) => ToolUseContext
  
  // MCP metadata
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
}
```

## Input/Output Schema Examples

### Simple Input/Output

```typescript
const ReadToolInput = z.object({
  path: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
})

const ReadToolOutput = z.object({
  path: z.string(),
  text: z.string(),
  from_line: z.number(),
  to_line: z.number(),
})
```

### Complex Input/Output

```typescript
const EditToolInput = z.object({
  path: z.string(),
  old_string: z.string(),
  new_string: z.string(),
  replace_all: z.boolean().optional(),
})

const EditToolOutput = z.object({
  path: z.string(),
  success: z.boolean(),
  modified_lines: z.number(),
  replacements: z.number(),
})
```

### Question Tool with Options

```typescript
const QuestionToolInput = z.object({
  header: z.string(),
  question: z.string(),
  options: z.array(z.object({
    label: z.string(),
    description: z.string(),
  })).optional(),
  multiple: z.boolean().optional(),
  custom: z.boolean().optional(),
})

const QuestionToolOutput = z.object({
  answers: z.array(z.array(z.string())),
  asked: z.literal(true),
})
```

## Permission Contract

Each tool declares its permission requirement:

```typescript
interface PermissionRule {
  permission: string      // Permission key (e.g., 'bash', 'edit')
  pattern?: string       // Pattern to match (e.g., 'git *', 'rm *')
  action: 'allow' | 'ask' | 'deny'
}

// Example: Bash tool rules
const bashPermission = {
  permission: 'bash',
  patterns: [
    { pattern: 'git *', action: 'ask' },
    { pattern: 'rm -rf *', action: 'deny' },
    { pattern: 'npm install', action: 'allow' },
  ]
}
```

## Tool Lifecycle Contract

```
Tool Registration
    ↓
Tool Available in Registry
    ↓
Tool Presented to Model
    ↓
Model Calls Tool
    ↓
Permission Check
    ↓
Input Validation
    ↓
Execution
    ↓
Output Normalization
    ↓
Result Stored
    ↓
Result Returned to Model
```

## Tool Metadata Contract

Tools must provide these metadata fields:

```typescript
interface ToolMetadata {
  name: string                    // Unique identifier
  description: string              // One-line description
  permission: string              // Permission key
  
  // Input/Output
  inputSchema: z.ZodType<any>    // Input validation schema
  outputSchema?: z.ZodType<any>  // Output validation schema
  
  // Behavior flags
  isEnabled: () => boolean       // Should tool be available?
  isConcurrencySafe: (input) => boolean  // Can run in parallel?
  isReadOnly: (input) => boolean  // Does not modify files?
  isDestructive?: (input) => boolean  // Is destructive operation?
  
  // Optional capabilities
  interruptBehavior?: () => 'cancel' | 'block'  // How to handle new message
  isSearchOrReadCommand?: (input) => SearchReadResult
  isOpenWorld?: (input) => boolean
  requiresUserInteraction?: () => boolean
  
  // MCP info
  mcpInfo?: { serverName: string; toolName: string }
}
```

## Build Tool Helper

Use `buildTool` to create tools with defaults:

```typescript
function buildTool<D extends ToolDef>(def: D): Tool {
  return {
    // Defaults
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    isDestructive: () => false,
    checkPermissions: async () => ({ behavior: 'allow' }),
    toAutoClassifierInput: () => '',
    userFacingName: () => def.name,
    
    // User-provided
    ...def,
  }
}

// Usage
const MyTool = buildTool({
  name: 'my_tool',
  description: 'Does something useful',
  permission: 'my_tool',
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  execute: async (input, context) => { ... },
})
```

## Validation Result Contract

```typescript
type ValidationResult =
  | { result: true }
  | {
      result: false
      message: string
      errorCode: number
    }
```

## Permission Result Contract

```typescript
type PermissionResult = {
  behavior: 'allow' | 'deny' | 'ask'
  updatedInput?: Record<string, unknown>
  ruleMatched?: string
}
```
