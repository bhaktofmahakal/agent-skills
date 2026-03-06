# Auth And Tenancy Guardrails

## 1. Auth Configuration Baseline

- Require a signing secret at boot (`BETTER_AUTH_SECRET` or equivalent).
- Use secure cookies in production only.
- Restrict trusted origins to explicit allowlist entries.
- Enable auth rate limiting and prefer shared backing store (Redis) with explicit fallback behavior.

## 2. Session Retrieval Strategy

Use retry only for transient categories:

- network/transient (`ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, DNS failures)
- database pool and timeout classes
- internal auth service failures (`5xx`, internal error markers)

Never retry on clearly invalid credentials/session states.

## 3. API Context Strategy

- Build request context from session retrieval with fallback state:
  - `userId` present -> authenticated flow
  - `userId` absent + auth healthy -> unauthorized flow
  - auth unavailable -> explicit service-unavailable style error
- Keep this distinction in all middleware/procedure stacks.

## 4. Resource Ownership Rules

For every workflow/run/credential endpoint:

1. Resolve authenticated user id.
2. Fetch target resource with owner relation.
3. Assert owner id equality.
4. Return `404` or `403` per product policy.
5. Continue only after ownership passes.

Apply this to:

- CRUD mutations
- execution mutations
- run detail/list endpoints
- websocket token issuance routes

## 5. Tenant-Safe Query Patterns

- Prefer owner-scoped `where` clauses (`id + userId`) for mutations.
- For list/detail views, derive allowed resource ids from owner scope before filtering by user-supplied ids.
- Avoid exposing cross-tenant counts or metadata in aggregate endpoints.

## 6. Failure Behavior

- If auth dependency is unavailable, fail with deterministic message and retry guidance.
- Do not silently downgrade to anonymous behavior on protected routes.
- Log auth system failures with context labels and throttling.

## 7. Validation Checklist

- Secret is required at startup.
- Protected routes reject requests without valid auth.
- Ownership checks exist for every resource read/write path.
- Auth outage path is distinguishable from `401` unauthorized.
- Trusted origins and cookie security are explicit by environment.
