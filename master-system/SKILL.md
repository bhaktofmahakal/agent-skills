---
name: master-agent-system
description: COMPLETE SYSTEM SPECIFICATION for building a Claude Code–class agent platform from scratch. This is the SINGLE SOURCE OF TRUTH - all other skills are deprecated. Use when ANY LLM must build the entire system with zero prior context.
---

# MASTER SYSTEM SPECIFICATION

This document is the COMPLETE, DETERMINISTIC specification for rebuilding a Claude Code–class agent system from scratch. Use ONLY this skill.

## Load Order

1. Read `bootstrap.md` - Project initialization and setup
2. Read `architecture.md` - System architecture
3. Read `agent-runtime.md` - Agent definitions and runtime
4. Read `skill/agent-builder.md` - Creating custom agents
4. Read `query-loop.md` - Main prompt loop
5. Read `tools.md` - Tool system
6. Read `mcp.md` - MCP integration
7. Read `multi-agent.md` - Multi-agent orchestration
8. Read `state.md` - State and session management
9. Read `memory.md` - Memory system (KAIROS)
10. Read `execution.md` - CLI and SDK
11. Read `reliability.md` - Error handling
12. Read `infra.md` - Infrastructure
13. Read `deployment.md` - Production deployment
14. Read `hidden-features.md` - Advanced features

## Non-Negotiable Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **HTTP**: Hono
- **Validation**: Zod
- **AI SDK**: Vercel AI SDK
- **Client**: Solid + Vite
- **Persistence**: SQLite (bun:sqlite)
- **Events**: SSE
- **Desktop**: Tauri, Electron
- **Orchestration**: Bun workspaces + Turbo

## System Identity

A local-first, provider-agnostic multi-agent coding platform:
- CLI for local development
- HTTP API server with project-scoped routing
- Shared web client
- TypeScript SDK
- Built-in agents: build, plan, general, explore, title, summary, compaction
- Tool registry with permission management
- MCP integration (stdio, http, sse)
- Sub-agent delegation through child sessions
- Hidden features: KAIROS, ULTRAPLAN, coordinator, voice, team memory

## Capability Parity

The rebuilt system must implement:
- CLI and local server
- SQLite-backed projects, sessions, messages, sync events
- Shared web client
- Generated SDK
- Built-in agents (7 types)
- Built-in tools (14 tools)
- Permissions and questions
- PTY terminal sessions
- MCP integration
- Plugin hooks
- Worktrees and workspaces
- Desktop wrappers
- GitHub and VS Code integrations
- Hidden features (KAIROS, ULTRAPLAN, etc.)

## Completion Criteria

The rebuild is complete when ALL are true:

1. New repository can be created from bootstrap alone
2. Server starts locally and answers all routes
3. Client creates session, submits prompt, streams parts
4. Child session created through task tool and merged
5. MCP servers registered, authenticated, exposed as tools
6. System survives all failure scenarios
7. All tests pass

## Key Specifications

- **Agent Loop**: Steps 1-10 in query-loop.md
- **Tool Execution**: 9-step lifecycle in tools.md
- **State Transitions**: Explicit in state.md
- **Failure Handling**: Complete matrix in reliability.md
- **MCP OAuth**: 9-step flow in mcp.md
- **Delegation**: Matrix in multi-agent.md

This is the COMPLETE SYSTEM. Use it to build everything.