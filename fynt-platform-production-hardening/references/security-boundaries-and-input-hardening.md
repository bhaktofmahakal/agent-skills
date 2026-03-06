# Security Boundaries And Input Hardening

## Webhook Ingress Policy

Process public webhook requests in this order:

1. Runtime gate check (`web-only`/automation-disabled short-circuit).
2. Global + endpoint rate limit check.
3. Resource existence and trigger state validation.
4. Secret verification with constant-time compare.
5. Body read with strict byte cap.
6. Content parsing (JSON or form-encoded fallback).
7. Query/header sanitation and metadata normalization.
8. Plan/concurrency reservation and enqueue.

## Secret Verification

- Use constant-time compare (`timingSafeEqual` or equivalent).
- Normalize both configured and provided secrets (`trim`, encoding-safe).
- On length mismatch, still execute compare against padded buffer before return false.
- Never log provided secrets.

## Rate Limiting Strategy

- Apply at least two dimensions:
  - caller/IP bucket
  - endpoint+resource bucket
- Return headers for observability:
  - `Retry-After`
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
- If protection layer is unavailable, prefer fail-safe behavior for high-risk endpoints.

## Payload, Header, Query Guards

- Enforce `content-length` and actual body byte limits.
- Reject malformed JSON with explicit `400`.
- Parse `application/x-www-form-urlencoded` safely.
- Sanitize headers:
  - block sensitive headers (`authorization`, `cookie`, secret headers)
  - cap header count, per-value bytes, and total bytes
- Sanitize query:
  - exclude secret/query auth keys
  - cap param count, per-value bytes, and total bytes

## Credential And Outbound Request Safety

- Encrypt credential payloads at rest using authenticated encryption (AES-256-GCM style).
- Keep encryption key identical across services that write/read credentials.
- Never return raw secret values in API responses.
- Validate outbound URLs centrally:
  - allowed schemes only (`http/https`)
  - block private/loopback/link-local/internal hostname targets
  - DNS resolve and block private resolved addresses

## Anti-Patterns To Reject

- Plain string equality for webhook secrets.
- Unlimited JSON/body parse on public routes.
- Accepting all incoming headers/query keys into execution context.
- Enqueueing webhook runs before rate/plan/concurrency checks.
- Allowing user-provided outbound URLs without SSRF validation.
