# Event Sync System

## Sync Event Model

```typescript
interface SyncEvent<T = unknown> {
  id: string
  projectId: string | null
  sessionId: string | null
  sequence: number
  type: string
  payload: T
  createdAt: number
}
```

## Event Emission

```typescript
class SyncManager {
  private sequence = 0
  
  emit<T>(event: SyncEvent<T>): void {
    this.sequence++
    
    const envelope = {
      ...event,
      sequence: this.sequence,
      createdAt: Date.now(),
    }
    
    // Persist
    this.persist(envelope)
    
    // Broadcast via SSE
    this.broadcast(envelope)
  }
  
  private persist(event: SyncEvent): void {
    // Write to sync_event table in same transaction as data
  }
  
  private broadcast(event: SyncEvent): void {
    // Send to all connected SSE clients
  }
}
```

## Event Types

- `project.created`, `project.updated`
- `session.created`, `session.updated`, `session.idle`
- `message.created`, `message.part.updated`
- `permission.asked`, `permission.replied`
- `question.asked`, `question.replied`, `question.rejected`
- `mcp.server.updated`, `mcp.tools.changed`
- `pty.created`, `pty.updated`, `pty.exited`
