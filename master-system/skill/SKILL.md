# Skill: Claude Code / OpenCode Agent Platform Replication

This skill provides comprehensive instructions for rebuilding the Claude Code / OpenCode agent platform from zero. The system is a high-performance CLI tool developed by Anthropic, designed to enable direct interaction with Claude for complex software engineering tasks.

## When To Use This Skill

Use this skill when you need to:
- Rebuild Claude Code / OpenCode-like agent platform from scratch
- Understand the full architecture of a multi-agent coding system
- Implement agent runtime, tools, and MCP integration
- Create a local-first AI coding assistant platform
- Build IDE integrations (VS Code, JetBrains)
- Implement remote control / bridge functionality

## System Architecture Overview

Based on the DeepWiki analysis of the Claude Code codebase:

### Four Architectural Pillars

1. **The Query Engine**: Central orchestration loop managing conversation state, tool-call iterations, and context window management.
2. **The Tool System**: Collection of strongly-typed capabilities (File I/O, Bash, LSP, MCP) that Claude can invoke.
3. **The REPL & UI Layer**: Terminal-based interface built with React and Ink.
4. **The Bridge & Remote Control**: Synchronization layer for IDE integration and remote sessions.

### Technology Stack
- **Runtime**: Bun
- **UI Framework**: React + Ink (terminal-based TUI)
- **Language**: TypeScript
- **State**: JSONL-based transcript system
- **Security**: Multi-tiered permission model (Default, Plan, Auto, Bypass)

## Skill Structure

This skill is organized into the following modules:

### Core Architecture
- `architecture/system-overview.md` - High-level system design
- `architecture/layers.md` - Five-layer architecture breakdown
- `architecture/data-flow.md` - Data movement through the system
- `architecture/module-boundaries.md` - Module responsibilities and boundaries

### Agents
- `agents/agent-types.md` - Built-in agent definitions
- `agents/agent-loop.md` - Prompt loop execution
- `agents/decision-logic.md` - Agent selection and tool decision trees
- `agents/delegation.md` - Sub-agent delegation patterns

### Tools
- `tools/registry.md` - Tool registry system
- `tools/execution.md` - Tool execution lifecycle
- `tools/contracts.md` - Tool definition contracts
- `tools/filtering.md` - Permission and provider filtering

### MCP (Model Context Protocol)
- `mcp/architecture.md` - MCP subsystem architecture
- `mcp/lifecycle.md` - Connection and disconnection lifecycle
- `mcp/auth.md` - OAuth authentication flows

### Execution
- `execution/runtime-loop.md` - Main runtime loop
- `execution/streaming.md` - Stream event handling
- `execution/async-handling.md` - Async prompt execution

### State
- `state/sessions.md` - Session management
- `state/messages.md` - Message and part storage
- `state/storage.md` - SQLite persistence
- `state/sync.md` - Event sync system

### Workflows
- `workflows/user-flow.md` - User prompt to response
- `workflows/agent-flow.md` - Agent execution flow
- `workflows/tool-flow.md` - Tool call lifecycle
- `workflows/multi-agent-flow.md` - Multi-agent orchestration

### Reliability
- `reliability/validation.md` - Validation layers
- `reliability/retries.md` - Retry logic
- `reliability/failure-handling.md` - Failure recovery

### Infrastructure
- `infra/server.md` - Hono server setup
- `infra/cli.md` - CLI commands
- `infra/config.md` - Configuration management

### Deployment
- `deployment/local.md` - Local development
- `deployment/production.md` - Production deployment
- `deployment/scaling.md` - Scaling rules

### Patterns
- `patterns/agent-patterns.md` - Reusable agent patterns
- `patterns/tool-patterns.md` - Tool patterns
- `patterns/orchestration.md` - Multi-agent orchestration

### Edge Cases
- `edge_cases/failures.md` - Failure handling
- `edge_cases/limits.md` - Context and resource limits

### Agent Builder
- `agent-builder.md` - Creating custom agents for the platform

### Assets
- `assets/code-snippets.md` - Canonical code implementations
- `assets/schemas.md` - TypeScript type definitions
- `assets/contracts.md` - API and event contracts

## Prerequisites

- Bun runtime
- TypeScript
- SQLite (via bun:sqlite)
- Hono
- Vercel AI SDK
- React + Ink (for terminal UI)
- Zod for validation

## Build Sequence

1. Read `bootstrap.md` for monorepo setup
2. Read `architecture.md` for system design
3. Read `workflows.md` for execution flows
4. Read `agents.md` for agent definitions
5. Read `tools.md` for tool registry
6. Read `mcp.md` for MCP integration
7. Read `execution.md` for runtime details
8. Read `reliability.md` for error handling
9. Read `state.md` for persistence
10. Read `infra.md` for server setup
11. Read `deployment.md` for production
12. Read `patterns.md` for reusable patterns
13. Read `edge_cases.md` for failure scenarios
14. Reference `assets/` for code and schemas
