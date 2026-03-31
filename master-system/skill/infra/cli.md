# CLI Commands

## Commands

### serve
Start the local server.

```bash
opencode serve
```

### run
Run a prompt in current directory.

```bash
opencode run "fix the bug in foo.ts"
```

### session
Manage sessions.

```bash
opencode session list
opencode session show <id>
opencode session delete <id>
```

### project
Manage projects.

```bash
opencode project list
opencode project current
```

### mcp
Manage MCP servers.

```bash
opencode mcp list
opencode mcp connect <name>
opencode mcp disconnect <name>
```

## Implementation

```typescript
import { parseArgs } from 'util'

const commands = {
  serve: async () => { /* start server */ },
  run: async (args: string[]) => { /* run prompt */ },
  session: async (args: string[]) => { /* session management */ },
  project: async (args: string[]) => { /* project management */ },
  mcp: async (args: string[]) => { /* MCP management */ },
}

export async function main() {
  const { positionals } = parseArgs({ args: process.argv.slice(2) })
  const [command, ...subcommand] = positionals
  await commands[command]?.(subcommand)
}
```
