# Configuration Management

## Config Precedence

1. Built-in defaults
2. Global config file
3. Repository config file
4. Environment variables
5. Per-request overrides

## Config File Locations

- Global: `${OPENCODE_CONFIG_DIR}/config.json`
- Repository: `.opencode/config.json`

## Environment Variables

```bash
OPENCODE_HOST=127.0.0.1
OPENCODE_PORT=4096
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_DATA_DIR=.data
OPENCODE_CONFIG_DIR=.config

# Provider API keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Search providers
OPENCODE_EXA_API_KEY=
```

## Instruction Files

Load priority:
1. Global `AGENTS.md`
2. User `CLAUDE.md`
3. Repository `AGENTS.md`
4. Repository `CLAUDE.md`
5. Repository `CONTEXT.md`
