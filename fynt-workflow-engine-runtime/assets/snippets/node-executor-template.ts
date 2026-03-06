import { parseTemplateWithMetadata } from "@repo/shared/parser";

export type NodeExecutionOutput =
  | string
  | number
  | boolean
  | null
  | { [key: string]: NodeExecutionOutput }
  | NodeExecutionOutput[];

type ExecutionMode = "legacy" | "strict_template_v1";

type CustomApiNodeData = {
  endpoint?: string;
  payloadTemplate?: string;
  responseName?: string;
};

export async function executeCustomApiNode(
  data: CustomApiNodeData,
  runMetadata: Record<string, NodeExecutionOutput>,
  executionMode: ExecutionMode = "legacy"
): Promise<NodeExecutionOutput> {
  const endpoint = data.endpoint?.trim();
  if (!endpoint) {
    if (executionMode === "strict_template_v1") {
      throw new Error("customApiNode missing endpoint.");
    }
    return {
      success: true,
      skipped: true,
      reason: "Node not configured - no endpoint",
    };
  }

  const renderedPayload = parseTemplateWithMetadata(
    data.payloadTemplate ?? "",
    runMetadata as Record<string, string>
  );

  if (executionMode === "strict_template_v1" && renderedPayload.missingVars?.length) {
    throw new Error(`Undefined template vars: ${renderedPayload.missingVars.join(", ")}`);
  }

  let payload: unknown = undefined;
  if (renderedPayload.output.trim()) {
    try {
      payload = JSON.parse(renderedPayload.output);
    } catch {
      payload = renderedPayload.output;
    }
  }

  // Replace with secure fetch helper + provider adapter.
  return {
    success: true,
    endpoint,
    payload,
    executedAt: new Date().toISOString(),
  };
}
