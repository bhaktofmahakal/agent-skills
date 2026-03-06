# Executor Safety Grammar

## Credential Handling

- Resolve credential by ID with owner scoping.
- Verify credential platform matches node type.
- Decrypt only in worker process memory.
- Never include raw credential secrets in returned output or stream events.

## Outbound HTTP Safety

- Validate URL scheme (`http`/`https` only).
- Block private network and metadata targets with DNS + IP checks.
- Apply explicit timeout and abort controller.
- Include actionable error hints for major status classes.

## Payload Safety

- Cap prompt and response text lengths for AI/HTTP nodes.
- Truncate stream payload previews; keep persistence payloads deliberate.
- Parse JSON template output strictly before provider calls.

## Provider Adapter Rules

- Keep each provider operation as explicit function branch.
- Map provider response into normalized output shape.
- Surface provider rate-limit and auth failures with human-readable hints.
- Avoid generic "request failed" errors without context.

## Template Variable Safety

- Parse templates with missing-variable metadata.
- In strict mode:
  - throw on unresolved variables
  - throw on invalid rendered JSON for JSON-input nodes
- In legacy mode:
  - allow controlled skip or structured failure for compatibility

## Soft Failure Policy

- Allow soft-failure only for selected node types where product semantics require continued execution.
- Convert `success=false` outputs to hard failures where reliability bar requires it.
- Document which node types are soft-failure eligible and why.
