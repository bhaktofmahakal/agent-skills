# Template And Variable Grammar

## Template Format

- Placeholder tokens use `{path.to.value}`.
- JSON-typed placeholders use `{json path.to.value}`.
- Paths are dot-separated and restricted to safe token chars.

## Parser Behavior

- Parser should return:
  - `output` string
  - `missingVars` array
  - `hasSubstitutions` boolean
- Parser should not throw for unresolved variables by default.
- Caller decides strict vs lenient behavior.

## Strict Template Mode

- Throw if template uses undefined variables.
- Throw if rendered JSON input is invalid.
- Throw if required config fields are absent.
- Use strict mode for template-backed production runs where deterministic behavior matters.

## Lenient Mode

- Preserve backward compatibility for older flows.
- Permit safe skip for incompletely configured nodes.
- Return structured failure payload when appropriate.

## JSON Input Rules

- For provider JSON inputs, validate post-rendered JSON by provider contract:
  - OpenAI-style messages array.
  - Anthropic messages role constraints.
  - Gemini contents/parts constraints.
- Reject empty rendered JSON payloads.

## Alias Rules

- Support stable alias mapping for upstream outputs only when deterministic.
- Avoid alias collisions; keep precedence rules explicit.
- Document alias injection behavior for prompt authors.
