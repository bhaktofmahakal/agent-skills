# SQLite Storage

## Database Schema

```sql
-- Core tables
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  directory TEXT NOT NULL,
  root TEXT NOT NULL,
  git_root TEXT,
  worktree TEXT,
  sandboxes TEXT,
  name TEXT,
  icon TEXT,
  initialized INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  workspace_id TEXT,
  directory TEXT NOT NULL,
  parent_id TEXT,
  title TEXT,
  summary TEXT,
  agent TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL,
  permission_mode TEXT DEFAULT 'default',
  revert_state TEXT,
  share_token TEXT,
  archived INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  format TEXT,
  structured_output TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE message_part (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  type TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sync_event (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  session_id TEXT,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

## Transaction Handling

```typescript
class Database {
  private db: Bun.SQLite.Database
  
  transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction(fn)()
  }
  
  async insert(table: string, row: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(row)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(row)
    
    await this.db.exec(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    )
  }
  
  async update(
    table: string,
    id: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ')
    const values = [...Object.values(updates), id]
    
    await this.db.exec(
      `UPDATE ${table} SET ${sets} WHERE id = ?`,
      values
    )
  }
  
  async query(table: string, filters: Record<string, unknown>): QueryBuilder {
    return new QueryBuilder(this.db, table, filters)
  }
}
```

## WAL Mode for Reliability

```typescript
async function enableWalMode(db: Database): Promise<void> {
  await db.exec('PRAGMA journal_mode = WAL')
  await db.exec('PRAGMA synchronous = NORMAL')
}
```
