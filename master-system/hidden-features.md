# HIDDEN FEATURES SPECIFICATION

This document defines hidden and advanced features of the agent platform.

---

## 1. KAIROS (Memory System)

### Overview

KAIROS is the automatic memory tracking system that:
- Tracks significant tool results
- Maintains session-level memory
- Consolidates on token pressure

### Implementation

```typescript
class KairosMemory {
  private memories: MemoryItem[] = []
  private consolidationThreshold = 0.7
  
  track(toolResult: ToolResult): void {
    if (!this.isSignificant(toolResult)) return
    
    this.memories.push({
      id: generateId(),
      type: this.getMemoryType(toolResult),
      content: this.extractContent(toolResult),
      timestamp: Date.now(),
      sessionId: toolResult.sessionId
    })
  }
  
  private isSignificant(result: ToolResult): boolean {
    // Track edits, writes, failed commands, grep hits
    return (
      result.tool === 'edit' ||
      result.tool === 'write' ||
      (result.tool === 'bash' && result.output.exit_code !== 0) ||
      (result.tool === 'grep' && result.output.matches.length > 0)
    )
  }
  
  async consolidate(messages: Message[]): Promise<MemorySummary> {
    // Analyze recent messages
    const facts = extractKeyFacts(messages)
    const decisions = extractDecisions(messages)
    const pending = extractPendingWork(messages)
    
    return { facts, decisions, pending }
  }
  
  getRelevant(query: string): MemoryItem[] {
    // Semantic search over memories
    return this.memories.filter(m => 
      m.content.toLowerCase().includes(query.toLowerCase())
    )
  }
}
```

---

## 2. ULTRAPLAN (Advanced Planning)

### Overview

ULTRAPLAN provides advanced planning capabilities:
- Dependency graph analysis
- Risk identification
- Task decomposition
- Timeline estimation

### Implementation

```typescript
class Ultraplan {
  async plan(task: string, context: CodeContext): Promise<Plan> {
    // 1. Analyze task requirements
    const requirements = await this.analyzeRequirements(task, context)
    
    // 2. Identify dependencies
    const deps = this.buildDependencyGraph(requirements)
    
    // 3. Identify risks
    const risks = await this.identifyRisks(requirements, context)
    
    // 4. Create execution plan
    return {
      phases: this.topologicalSort(deps),
      risks,
      estimate: this.estimateTimeline(requirements),
      checkpoints: this.generateCheckpoints(deps)
    }
  }
  
  private async analyzeRequirements(task: string, context: CodeContext): Promise<Requirement[]> {
    // Use LLM to decompose task into requirements
    const prompt = `
      Decompose this task into discrete requirements:
      ${task}
      
      Return JSON array of requirements with:
      - description
      - files_affected
      - complexity (1-5)
    `
    // ...
  }
  
  private buildDependencyGraph(requirements: Requirement[]): Graph {
    // Build directed graph of dependencies
    // Detect cycles, suggest parallelization
  }
  
  private async identifyRisks(requirements: Requirement[], context: CodeContext): Promise<Risk[]> {
    // Check for:
    // - Breaking changes
    // - Complex refactoring
    // - Untested code
    // - External dependencies
  }
}
```

---

## 3. COORDINATOR MODE

### Overview

Coordinator mode orchestrates multiple agents:
- Task decomposition
- Parallel execution
- Result merging

### Implementation

```typescript
class Coordinator {
  async orchestrate(task: string, agents: string[]): Promise<CoordinationResult> {
    // 1. Decompose into subtasks
    const subtasks = await this.decompose(task)
    
    // 2. Launch independent tasks in parallel
    const children = await Promise.all(
      subtasks.map(st => this.spawnAgent(st, agents))
    )
    
    // 3. Wait for completion
    const results = await Promise.all(
      children.map(c => c.waitForCompletion())
    )
    
    // 4. Merge results
    return this.mergeResults(results)
  }
  
  private async decompose(task: string): Promise<Subtask[]> {
    // Use LLM to decompose
  }
  
  private async mergeResults(results: AgentResult[]): Promise<CoordinationResult> {
    // Synthesize into coherent response
  }
}
```

---

## 4. REMOTE CONTROL / BRIDGE

### Overview

Bridge enables remote agent control:
- Work polling
- Session spawning
- Result retrieval

### Implementation

```typescript
class BridgeClient {
  private baseUrl: string
  
  async pollForWork(): Promise<WorkItem | null> {
    const response = await fetch(`${this.baseUrl}/bridge/poll`)
    return response.json().work
  }
  
  async acknowledgeWork(workId: string): Promise<void> {
    await fetch(`${this.baseUrl}/bridge/ack`, {
      method: 'POST',
      body: JSON.stringify({ workId })
    })
  }
  
  spawnSession(work: WorkItem): ChildProcess {
    return spawn('opencode', [
      '--continue',
      '--session-id', work.sessionId,
      '--directory', work.directory
    ])
  }
}
```

---

## 5. AUTO-MODE

### Overview

Auto-mode automatically determines agent behavior:
- Plan vs execute detection
- Mode switching heuristics

### Implementation

```typescript
class AutoMode {
  async determineMode(prompt: string): Promise<'plan' | 'build'> {
    // Use classifier to determine mode
    const classification = await this.classify(prompt)
    return classification.mode
  }
  
  private async classify(prompt: string): Promise<Classification> {
    // Analyze prompt for:
    // - Planning keywords ("plan", "design", "architecture")
    // - Execution keywords ("fix", "implement", "create")
    // - Complexity indicators
  }
}
```

---

## 6. VOICE MODE

### Overview

Voice mode enables voice interactions:
- Speech-to-text
- Text-to-speech
- Voice activity detection

### Implementation

```typescript
class VoiceMode {
  private stt: SpeechToText
  private tts: TextToSpeech
  
  async start(sessionId: string): Promise<void> {
    // Initialize audio streams
    // Start voice activity detection
  }
  
  async processAudio(audioData: Buffer): Promise<string> {
    return this.stt.transcribe(audioData)
  }
  
  async speak(text: string): Promise<void> {
    const audio = await this.tts.synthesize(text)
    // Stream to client
  }
}
```

---

## 7. TEAM MEMORY

### Overview

Team memory shares context across sessions:
- Shared knowledge base
- Team-wide context
- Cross-session recall

### Implementation

```typescript
class TeamMemory {
  private store: Map<string, MemoryEntry[]>
  
  async add(entry: MemoryEntry): Promise<void> {
    const key = entry.teamId
    const existing = this.store.get(key) || []
    this.store.set(key, [...existing, entry])
  }
  
  async search(teamId: string, query: string): Promise<MemoryEntry[]> {
    const entries = this.store.get(teamId) || []
    return entries.filter(e => 
      e.content.toLowerCase().includes(query.toLowerCase())
    )
  }
  
  async getContext(teamId: string): Promise<string> {
    const entries = this.store.get(teamId) || []
    return entries.map(e => e.content).join('\n')
  }
}
```

---

## 8. COST TRACKING

### Overview

Cost tracking monitors resource usage:
- Token consumption
- Cost per session
- Budget management

### Implementation

```typescript
class CostTracker {
  private costs = new Map<string, CostRecord>()
  
  async track(sessionId: string, usage: Usage): Promise<void> {
    const cost = this.calculateCost(usage)
    this.costs.set(sessionId, {
      ...this.costs.get(sessionId),
      tokens: usage.tokens,
      cost,
      timestamp: Date.now()
    })
  }
  
  private calculateCost(usage: Usage): number {
    const rates = getModelRates(usage.model)
    return (usage.inputTokens * rates.input) + 
           (usage.outputTokens * rates.output)
  }
  
  async getSessionCost(sessionId: string): Promise<CostRecord> {
    return this.costs.get(sessionId)
  }
}
```

---

This hidden features specification is COMPLETE and DETERMINISTIC.