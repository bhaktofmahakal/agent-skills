# MEMORY SYSTEM SPECIFICATION (KAIROS)

This document defines the memory system for the agent platform.

---

## 1. AUTO-MEMORY TRACKING

### What Gets Tracked

- Significant tool results (file changes, command outputs)
- Key decisions made during session
- User preferences expressed
- Important facts discovered about codebase

### Implementation

```typescript
class MemoryService {
  private memories: MemoryItem[] = []
  
  track(toolResult: ToolResult): void {
    // Only track significant results
    if (!isSignificant(toolResult)) return
    
    const item: MemoryItem = {
      id: generateId(),
      type: getMemoryType(toolResult),
      content: extractKeyInfo(toolResult),
      timestamp: Date.now(),
      sessionId: toolResult.sessionId
    }
    
    this.memories.push(item)
  }
  
  private isSignificant(result: ToolResult): boolean {
    // File edits, bash outputs, search results with hits
    return (
      result.tool === 'edit' ||
      result.tool === 'write' ||
      (result.tool === 'bash' && result.output.exit_code !== 0) ||
      (result.tool === 'grep' && result.output.matches.length > 0) ||
      result.tool === 'read'  // Important file reads
    )
  }
  
  private extractKeyInfo(result: ToolResult): string {
    switch (result.tool) {
      case 'edit':
        return `Edited ${result.input.path}`
      case 'write':
        return `Created ${result.input.path}`
      case 'bash':
        return `Command: ${result.input.command}`
      case 'grep':
        return `Found ${result.output.matches.length} matches for "${result.input.pattern}"`
      default:
        return JSON.stringify(result.output).slice(0, 200)
    }
  }
}
```

---

## 2. MEMORY CONSOLIDATION

### When to Consolidate

1. Token budget > 70%
2. Session pause > 10 minutes
3. Explicit user request

### Consolidation Process

```typescript
async function consolidate(
  messages: Message[],
  budget: TokenBudget
): Promise<MemorySummary> {
  // 1. Analyze recent messages
  const recent = messages.slice(-20)
  const facts = extractFacts(recent)
  const decisions = extractDecisions(recent)
  const pending = extractPendingWork(recent)
  
  // 2. Create summary preserving structure
  const summary = `
## Session Summary

### Key Facts Discovered
${facts.join('\n')}

### Decisions Made
${decisions.join('\n')}

### Pending Work
${pending.join('\n')}

### Important Files
${extractImportantFiles(recent).join('\n')}
`
  
  // 3. Return summary for compaction agent
  return { summary, facts, decisions, pending }
}
```

---

## 3. SKILL LOADING

### Skill Tool

```typescript
{
  name: 'skill',
  description: 'Load a skill',
  permission: 'skill',
  input: z.object({
    name: z.string(),
    path: z.string().optional()
  }),
  output: z.object({
    path: z.string(),
    content: z.string()
  }),
  execute: async (ctx, input) => {
    const content = await loadSkill(input.name, input.path)
    return { path: input.path || input.name, content }
  }
}
```

### Skill Resolution

```
1. Check if skill name matches file in skills/ directory
2. Check if skill name matches directory in .opencode/skills/
3. Load SKILL.md from matched location
4. Return content for injection into system prompt
```

---

## 4. INSTRUCTION FILES

### Supported Files

- `CLAUDE.md` - Project-specific instructions
- `AGENTS.md` - Agent definitions
- `CONTEXT.md` - Additional context
- `.claude/settings.json` - Claude-specific settings

### Loading Priority

```
1. Repository root CLAUDE.md
2. .claude/settings.json
3. Global config instructions
4. Environment variables
```

---

This memory system specification is COMPLETE and DETERMINISTIC.