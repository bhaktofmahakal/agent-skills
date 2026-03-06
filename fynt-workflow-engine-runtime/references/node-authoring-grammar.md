# Node Authoring Grammar

Use this workflow when adding or upgrading node types.

## Add-Node Sequence

1. Define contracts
- Add TypeScript interface for node data.
- Add node union entry in runtime node type definitions.

2. Define schemas
- Add zod schema for node data.
- Add discriminated union branch in workflow node schema.

3. Add executor
- Implement executor in domain folder:
  - `executors/ai`
  - `executors/request`
  - `executors/communication`
  - `executors/flow`
  - `executors/trigger`

4. Register dispatch
- Add node type dispatch in node executor switch.

5. Register metadata
- Add node definition in shared node registry for editor discoverability.

6. Validate and test
- Add tests for parser/schema acceptance/rejection.
- Add execution tests for success, config error, external error, and fallback behavior.

## Node Data Contract Rules

- Keep required fields minimal and explicit.
- Keep optional fields typed and documented.
- Include `responseName` style aliasing only when useful for chaining outputs.
- Never store secrets directly in node config when credential IDs can be used.

## Config Validation Rules

- Distinguish:
  - missing config (design-time/setup issue)
  - runtime error (provider/network/service issue)
- In strict mode, throw for missing config and undefined template variables.
- In legacy mode, allow safe skip or soft-failure object only where explicitly intended.

## Execution Wrapper Rules

- Never execute node logic directly from run loop.
- Always route through shared node execution wrapper that handles:
  - nodeRun create/update
  - retry increments
  - status streaming events
  - standardized failure persistence

## Output Design Rules

- Return structured object payload where possible.
- Preserve `success` semantics consistently.
- Include key metadata:
  - provider model name
  - HTTP status
  - cursor/next-page markers
  - truncated flags where applicable
