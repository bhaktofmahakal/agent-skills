# Tool Filtering Logic

## Overview

Tool filtering ensures agents only see tools appropriate for their context, permissions, and capabilities. Filtering happens at multiple levels.

## Filter Layers

```
┌─────────────────────────────────────────────────────────┐
│                   FILTER STACK                          │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Agent Allowlist/Denylist                     │
│    ↓                                                    │
│  Layer 2: Permission Policy                            │
│    ↓                                                    │
│  Layer 3: Provider/Model Capability                    │
│    ↓                                                    │
│  Layer 4: Feature Flags                                │
│    ↓                                                    │
│  Layer 5: Runtime Availability                        │
└─────────────────────────────────────────────────────────┘
```

## Layer 1: Agent Allowlist/Denylist

```typescript
function filterByAgent(
  tools: Tool[],
  agent: AgentDefinition
): Tool[] {
  const allowedTools = new Set(agent.allowedTools || [])
  const deniedTools = new Set(agent.deniedTools || [])
  
  return tools.filter(tool => {
    // If agent has explicit allowlist, only those allowed
    if (allowedTools.size > 0) {
      return allowedTools.has(tool.name)
    }
    
    // Otherwise check denylist
    if (deniedTools.has(tool.name)) {
      return false
    }
    
    return true
  })
}

// Example agent configs
const buildAgent = {
  name: 'build',
  allowedTools: [],  // Empty = all allowed
  deniedTools: [],
}

const planAgent = {
  name: 'plan',
  allowedTools: [],
  deniedTools: ['edit', 'write', 'bash', 'task'],
}
```

## Layer 2: Permission Policy

```typescript
function filterByPermission(
  tools: Tool[],
  permissionContext: ToolPermissionContext
): Tool[] {
  const { mode, alwaysAllowRules, alwaysDenyRules } = permissionContext
  
  return tools.filter(tool => {
    const toolPermission = tool.permission
    
    // Check explicit deny rules first
    if (alwaysDenyRules[toolPermission]?.length > 0) {
      const rules = alwaysDenyRules[toolPermission]
      // Check if any rule denies this specific tool call
      return !rules.some(r => matchToolPattern(tool.name, r.pattern))
    }
    
    // Check always-allow rules
    if (alwaysAllowRules[toolPermission]?.length > 0) {
      const rules = alwaysAllowRules[toolPermission]
      // Check if any rule allows this specific tool call
      return rules.some(r => matchToolPattern(tool.name, r.pattern))
    }
    
    // In bypass mode, allow all
    if (mode === 'bypass') {
      return true
    }
    
    // Default: allow
    return true
  })
}

function matchToolPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true
  if (pattern === toolName) return true
  
  // Glob patterns like "git *"
  const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
  return regex.test(toolName)
}
```

## Layer 3: Provider/Model Capability

```typescript
function filterByProvider(
  tools: Tool[],
  provider: Provider,
  model: string
): Tool[] {
  return tools.filter(tool => {
    // Check if tool requires patch capability
    if (tool.name === 'apply_patch' && !provider.supportsPatch) {
      return false
    }
    
    // Check model-specific tools
    if (tool.requiredModels?.length > 0) {
      if (!tool.requiredModels.includes(model)) {
        return false
      }
    }
    
    // Check for deprecated tools
    if (tool.deprecated && tool.deprecated.includes(model)) {
      return false
    }
    
    return true
  })
}

// Provider capability interface
interface Provider {
  id: string
  name: string
  supportsPatch: boolean
  supportsFunctionCalling: boolean
  supportsJsonMode: boolean
  maxTokens: number
  contextWindow: number
}
```

## Layer 4: Feature Flags

```typescript
function filterByFeatureFlags(
  tools: Tool[],
  flags: FeatureFlags
): Tool[] {
  return tools.filter(tool => {
    // Check feature flag requirements
    if (tool.requiredFeature && !flags[tool.requiredFeature]) {
      return false
    }
    
    // Check for feature-gated tools
    const featureGate = FEATURE_GATES[tool.name]
    if (featureGate && !featureGate.isEnabled()) {
      return false
    }
    
    return true
  })
}

const FEATURE_GATES = {
  web_browser: () => process.env.ENABLE_WEB_BROWSER === 'true',
  lsp_tool: () => process.env.ENABLE_LSP_TOOL === 'true',
  worktree: () => process.env.ENABLE_WORKTREE === 'true',
  agent_swarms: () => process.env.ENABLE_AGENT_SWARMS === 'true',
}
```

## Layer 5: Runtime Availability

```typescript
function filterByRuntime(
  tools: Tool[],
  runtime: RuntimeContext
): Tool[] {
  return tools.filter(tool => {
    // Check enabled method
    if (tool.isEnabled && !tool.isEnabled()) {
      return false
    }
    
    // Check concurrency safety
    if (tool.isConcurrencySafe && !tool.isConcurrencySafe({})) {
      if (runtime.concurrentToolCount > 0) {
        return false
      }
    }
    
    // Check read-only mode
    if (runtime.readOnly && tool.isReadOnly && !tool.isReadOnly({})) {
      return false
    }
    
    return true
  })
}
```

## Combined Filter Pipeline

```typescript
function filterToolPool(
  tools: Tool[],
  context: FilterContext
): Tool[] {
  let filtered = tools
  
  // Layer 1: Agent
  filtered = filterByAgent(filtered, context.agent)
  
  // Layer 2: Permission
  filtered = filterByPermission(filtered, context.permissionContext)
  
  // Layer 3: Provider
  filtered = filterByProvider(filtered, context.provider, context.model)
  
  // Layer 4: Feature flags
  filtered = filterByFeatureFlags(filtered, context.flags)
  
  // Layer 5: Runtime
  filtered = filterByRuntime(filtered, context.runtime)
  
  return filtered
}

interface FilterContext {
  agent: AgentDefinition
  permissionContext: ToolPermissionContext
  provider: Provider
  model: string
  flags: FeatureFlags
  runtime: RuntimeContext
}
```

## MCP Tool Filtering

MCP tools have additional filtering:

```typescript
function filterMcpTools(
  mcpTools: Tool[],
  permissionContext: ToolPermissionContext,
  denyRules: ToolPermissionRulesBySource
): Tool[] {
  return mcpTools.filter(tool => {
    // MCP tools are namespaced to detect blanket denials
    const serverName = tool.mcpInfo?.serverName
    const toolName = tool.name
    
    // Check if entire server is denied
    if (serverName) {
      const serverRule = denyRules['mcp']?.find(r => r.source === serverName)
      if (serverRule?.action === 'deny') {
        return false
      }
    }
    
    // Check permission context
    const permission = permissionContext.alwaysDenyRules['mcp'] || []
    for (const rule of permission) {
      if (matchToolPattern(toolName, rule.pattern)) {
        return false
      }
    }
    
    return true
  })
}
```

## Tool Search Deferral

Tools can be marked as deferred (requires ToolSearch):

```typescript
function filterDeferredTools(
  tools: Tool[],
  context: FilterContext
): { immediate: Tool[]; deferred: Tool[] } {
  // If tool search not enabled, all tools are immediate
  if (!context.flags.toolSearchEnabled) {
    return { immediate: tools, deferred: [] }
  }
  
  return tools.reduce(
    (acc, tool) => {
      if (tool.shouldDefer && !tool.alwaysLoad) {
        acc.deferred.push(tool)
      } else {
        acc.immediate.push(tool)
      }
      return acc
    },
    { immediate: [], deferred: [] } as { immediate: Tool[]; deferred: Tool[] }
  )
}
```

## Result: Filtered Tool Pool

After all filtering, the model receives a curated tool list:

```typescript
interface FilteredToolPool {
  tools: Tool[]              // Available to model
  totalCount: number         // All tools before filtering
  filteredCount: number      // Tools after filtering
  deferredCount: number      // Tools requiring ToolSearch
  filters: {
    agent: number
    permission: number
    provider: number
    feature: number
    runtime: number
  }
}
```
