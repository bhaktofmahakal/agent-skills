import { validateOutboundUrl } from "@repo/shared/ssrf";

const DEFAULT_TIMEOUT_MS = 15_000;

export async function secureJsonRequest<T>(params: {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}): Promise<T> {
  await validateOutboundUrl(params.url);

  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(params.url, {
      method: params.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(params.headers ?? {}),
      },
      ...(params.body !== undefined ? { body: JSON.stringify(params.body) } : {}),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 400)}`);
    }

    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
