# Local Development

## Running Locally

```bash
# Start server
bun run --cwd packages/opencode src/index.ts serve

# Start client
bun run --cwd packages/app dev
```

## Data Storage

- SQLite: `${OPENCODE_DATA_DIR}/db.sqlite`
- MCP Auth: `${OPENCODE_DATA_DIR}/mcp-auth.json`
- Logs: `${OPENCODE_DATA_DIR}/logs/`
