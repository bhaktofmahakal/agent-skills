import { timingSafeEqual } from "node:crypto";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

export function secretsMatch(expectedSecret: string, providedSecret: string): boolean {
  const expected = Buffer.from(expectedSecret, "utf8");
  const provided = Buffer.from(providedSecret, "utf8");

  // Keep comparison timing stable even when lengths differ.
  if (expected.length !== provided.length) {
    const padded = Buffer.alloc(expected.length);
    provided.copy(padded, 0, 0, Math.min(provided.length, expected.length));
    timingSafeEqual(expected, padded);
    return false;
  }

  return timingSafeEqual(expected, provided);
}

export function assertBodySize(rawBody: string, maxBytes: number): void {
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    throw new Error(`Payload too large. Max ${maxBytes} bytes.`);
  }
}

export function sanitizeHeaders(input: Headers): Record<string, string> {
  const blocked = new Set(["authorization", "cookie", "x-secret"]);
  const output: Record<string, string> = {};
  let count = 0;

  input.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (blocked.has(normalized)) return;
    if (count >= 40) return;
    output[normalized] = value.slice(0, 512);
    count += 1;
  });

  return output;
}

export function sanitizeQuery(url: URL, excludedKeys: string[] = []): Record<string, string> {
  const excluded = new Set(excludedKeys);
  const output: Record<string, string> = {};
  let count = 0;

  url.searchParams.forEach((value, key) => {
    if (excluded.has(key)) return;
    if (count >= 20) return;
    output[key] = value.slice(0, 512);
    count += 1;
  });

  return output;
}

export async function handleWebhookRequest(request: Request, params: {
  configuredSecret: string;
  providedSecret: string;
  maxBytes: number;
  applyRateLimit: () => Promise<RateLimitResult>;
}): Promise<{
  payload: unknown;
  query: Record<string, string>;
  headers: Record<string, string>;
}> {
  const rate = await params.applyRateLimit();
  if (!rate.allowed) {
    throw new Error(`Rate limited. Retry after ${rate.retryAfterSec}s.`);
  }

  if (!secretsMatch(params.configuredSecret, params.providedSecret)) {
    throw new Error("Invalid webhook secret.");
  }

  const rawBody = await request.text();
  assertBodySize(rawBody, params.maxBytes);

  let payload: unknown = rawBody;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Keep raw text payload for non-JSON webhook senders.
  }

  const url = new URL(request.url);
  return {
    payload,
    query: sanitizeQuery(url, ["secret"]),
    headers: sanitizeHeaders(request.headers),
  };
}
