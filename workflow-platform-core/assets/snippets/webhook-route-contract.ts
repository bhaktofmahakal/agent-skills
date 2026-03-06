import { NextRequest, NextResponse } from "next/server";

type LimitResult = { allowed: boolean; retryAfterSec: number };

async function applyRateLimit(_key: string, _limit: number, _windowSec: number): Promise<LimitResult> {
  // Replace with redis-backed limiter.
  return { allowed: true, retryAfterSec: 0 };
}

function safeCompareSecret(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  return expected.length === provided.length && expected === provided;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workflowId: string; nodeId: string }> }
) {
  const { workflowId, nodeId } = await context.params;

  // 1) Runtime mode guard.
  if (process.env.RUNTIME_MODE === "web-only") {
    return NextResponse.json({ error: "Automation is disabled in web-only mode." }, { status: 503 });
  }

  // 2) Rate limits (IP and endpoint scoped).
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const ipLimit = await applyRateLimit(`webhook:ip:${ip}`, 60, 60);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "IP rate limit exceeded." }, { status: 429 });
  }

  const endpointLimit = await applyRateLimit(`webhook:endpoint:${workflowId}:${nodeId}:${ip}`, 30, 60);
  if (!endpointLimit.allowed) {
    return NextResponse.json({ error: "Endpoint rate limit exceeded." }, { status: 429 });
  }

  // 3) Resolve workflow+node and validate node type/isActive/isConfigured.
  // TODO: query DB and enforce ownership semantics as needed.

  // 4) Verify shared secret.
  const configuredSecret = "replace-from-node-config";
  const providedSecret =
    request.nextUrl.searchParams.get("secret") || request.headers.get("x-platform-secret") || "";
  if (!safeCompareSecret(configuredSecret, providedSecret)) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
  }

  // 5) Parse payload with byte-size limits and sanitize headers/query.
  const payload = await request.json().catch(() => null);

  // 6) Reserve run usage under lock, create run row, enqueue job.
  // TODO: reserve monthly usage + concurrency before enqueue.
  // TODO: rollback usage if enqueue fails.
  const runId = crypto.randomUUID();

  return NextResponse.json({
    success: true,
    runId,
    workflowId,
    source: "webhook",
    payloadPreview: payload ? "received" : "empty-or-invalid",
  });
}
