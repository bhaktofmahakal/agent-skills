export type RuntimeMode = "full" | "web-only";

const RUNTIME_VALUES = new Set<RuntimeMode>(["full", "web-only"]);

function parseRuntimeMode(value: string | undefined): RuntimeMode | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return RUNTIME_VALUES.has(normalized as RuntimeMode)
    ? (normalized as RuntimeMode)
    : null;
}

export function getServerRuntimeMode(): RuntimeMode {
  return (
    parseRuntimeMode(process.env.FYNT_RUNTIME_MODE) ??
    (process.env.NODE_ENV === "production" ? "web-only" : "full")
  );
}

export function getClientRuntimeMode(): RuntimeMode {
  return (
    parseRuntimeMode(process.env.NEXT_PUBLIC_FYNT_RUNTIME_MODE) ??
    (process.env.NODE_ENV === "production" ? "web-only" : "full")
  );
}

export function isExecutionBlockedServerSide(): boolean {
  return getServerRuntimeMode() === "web-only";
}

export function isExecutionBlockedClientSide(): boolean {
  return getClientRuntimeMode() === "web-only";
}

export function isAutomationDisabledInProduction(): boolean {
  if (getServerRuntimeMode() === "web-only") return true;
  if (process.env.NODE_ENV !== "production") return false;
  return process.env.FYNT_ENABLE_AUTOMATION_IN_PRODUCTION !== "true";
}
