import { z } from "zod";

const MAX_TITLE = 200;
const MAX_NODES = 200;
const MAX_EDGES = 500;
const MAX_ACTIONS = 200;

const jsonValueSchema = z.unknown();

export const workflowActionSchema = z.object({
  id: z.string().min(1).max(100),
  availableActionId: z.string().min(1).max(100),
  metadata: jsonValueSchema,
});

export const createWorkflowSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(MAX_TITLE),
  availableTriggerId: z.string().min(1).max(100),
  triggerMetadata: jsonValueSchema,
  actions: z.array(workflowActionSchema).max(MAX_ACTIONS),
  nodes: z.array(jsonValueSchema).max(MAX_NODES),
  edges: z.array(jsonValueSchema).max(MAX_EDGES),
});

export const updateWorkflowSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(MAX_TITLE).optional(),
  nodes: z.array(jsonValueSchema).max(MAX_NODES).optional(),
  edges: z.array(jsonValueSchema).max(MAX_EDGES).optional(),
  triggerMetadata: jsonValueSchema.optional(),
  actions: z.array(workflowActionSchema).max(MAX_ACTIONS).optional(),
});

export const executeWorkflowSchema = z
  .object({
    workflowId: z.string(),
    nodeId: z.string().optional(),
    triggerSource: z.enum(["cron", "webhook"]).optional(),
    triggerNodeId: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    const hasNodeRun = Boolean(input.nodeId);
    const hasTriggerRun = Boolean(input.triggerSource || input.triggerNodeId);

    if (hasNodeRun && hasTriggerRun) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either nodeId OR triggerSource+triggerNodeId, not both.",
      });
    }

    if (Boolean(input.triggerSource) !== Boolean(input.triggerNodeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "triggerSource and triggerNodeId must be provided together.",
      });
    }
  });

export function assertTemplateGraphNotEmpty(nodes: unknown[], templateId: string | null): void {
  if (templateId && nodes.length === 0) {
    throw new Error(`Template workflow "${templateId}" cannot be persisted with empty nodes.`);
  }
}

export function extractTemplateId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).templateId;
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Integrate these schemas inside your tRPC/REST handlers and add:
 * - ownership checks
 * - graph shape validation
 * - plan/concurrency reservation under lock
 * - enqueue rollback behavior
 */
