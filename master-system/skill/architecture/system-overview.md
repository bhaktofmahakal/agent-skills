# System Overview

## What This System Is

A local-first, provider-agnostic multi-agent coding platform that combines:
- A CLI for local development
- An HTTP API server with project-scoped routing
- A shared web client for interactive sessions
- A TypeScript SDK for programmatic access
- Built-in agents for different tasks
- A tool registry with permission management
- MCP (Model Context Protocol) integration
- Sub-agent delegation through child sessions

## Core Design Principles

1. **Local-First**: Every feature works against a local server with on-disk state
2. **Provider Agnostic**: Support multiple AI providers without changing core logic
3. **Event-Driven**: Durable events + read-model projections for state
4. **Session-Based**: Sub-agents implemented as child sessions
5. **Permission-Gated**: All tool execution goes through permission engine

## Five-Layer Architecture

### Layer 1: Client Surfaces
- **packages/app**: Shared Solid client for web and desktop
- **packages/desktop**: Tauri wrapper
- **packages/desktop-electron**: Electron wrapper
- **sdks/vscode**: VS Code integration
- **github**: GitHub automation entrypoint

Responsibilities:
- Render project, session, message, tool, diff, and permission UI
- Connect to server through generated SDK clients
- Maintain local ephemeral UI state only
- Consume authoritative state through REST + SSE

### Layer 2: Control Plane Server
- **Location**: packages/opencode/src/server/server.ts
- **Framework**: Hono HTTP server

Responsibilities:
- Start the Bun HTTP server
- Expose /global routes for config, auth, logs, docs
- Expose global SSE routes for cross-directory events
- Apply CORS, compression, logging, and auth middleware
- Forward workspace-bound requests to workspace router

### Layer 3: Instance Router
- **Location**: packages/opencode/src/server/router.ts and instance.ts

Responsibilities:
- Resolve active directory/workspace from headers and query params
- Materialize project instance keyed by directory
- Mount instance-scoped routes for all domain APIs
- Proxy remote workspace requests when needed

### Layer 4: Runtime Services
- **Location**: packages/opencode/src/

Subsystems:
- **project/**: Repository discovery, worktree resolution, project identity
- **session/**: Messages, prompts, stream processor, summaries, compaction, retries
- **tool/**: Built-in tool implementations and registry
- **agent/**: Built-in agent definitions and config overlays
- **permission/**: Rule evaluation and approval persistence
- **mcp/**: MCP servers, tools, prompts, resources, auth
- **plugin/**: Internal and external plugin loading
- **provider/**: Model/provider adapters and auth
- **question/**: Deferred user-question requests
- **pty/**: Terminal session management and WebSocket streaming

### Layer 5: Persistence And Sync
- **storage/**: SQLite connection, migrations, transactions
- **sync/**: Durable events and publisher
- **projectors.ts**: Read-model updates and event hydration

Authoritative State (in SQLite):
- Projects
- Sessions
- Messages and message parts
- Permissions
- Provider auth
- MCP auth
- Sync events
- Snapshots and summaries

Runtime-Only State (in memory):
- Pending permission requests
- Pending question requests
- Active PTY sessions
- Running abort controllers
