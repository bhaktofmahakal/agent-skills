import { z } from "zod";

export interface CustomApiNodeData {
  credentialId?: string;
  endpoint?: string;
  method?: "GET" | "POST";
  payloadTemplate?: string;
  responseName?: string;
}

export type WorkflowNode =
  | {
      id: string;
      type: "customApiNode";
      data: CustomApiNodeData;
      position?: { x: number; y: number };
    }
  | {
      id: string;
      type: "manualTrigger";
      data: Record<string, unknown>;
      position?: { x: number; y: number };
    };

export const customApiNodeDataSchema = z
  .object({
    credentialId: z.string().optional(),
    endpoint: z.string().url().optional(),
    method: z.enum(["GET", "POST"]).optional(),
    payloadTemplate: z.string().optional(),
    responseName: z.string().optional(),
  })
  .passthrough();

export const workflowNodeSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: z.string(),
      type: z.literal("customApiNode"),
      data: customApiNodeDataSchema,
      position: z.object({ x: z.number(), y: z.number() }).optional(),
    })
    .passthrough(),
  z
    .object({
      id: z.string(),
      type: z.literal("manualTrigger"),
      data: z.record(z.unknown()).optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
    })
    .passthrough(),
]);
