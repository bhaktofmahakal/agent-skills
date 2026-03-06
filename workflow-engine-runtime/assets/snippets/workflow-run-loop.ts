import { NodeStatus, WorkflowStatus } from "@repo/prisma";

type WorkflowNode = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

type ExecCtx = {
  runId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export async function executeWorkflowRun(ctx: ExecCtx): Promise<void> {
  // 1) Acquire run lock before doing any work.
  // 2) Parse and validate graph payloads.
  // 3) Detect cycles.
  // 4) Resolve start nodes from run source.
  // 5) Execute ready nodes and persist NodeRun status.
  // 6) Publish node/workflow events.
  // 7) Mark run terminal status and release lock.

  const completed = new Set<string>();
  const failed = new Set<string>();

  for (const node of ctx.nodes) {
    try {
      await markNodeStatus(ctx.runId, node.id, NodeStatus.Running);
      // Dispatch node logic here.
      await markNodeStatus(ctx.runId, node.id, NodeStatus.Success);
      completed.add(node.id);
    } catch (error) {
      await markNodeStatus(ctx.runId, node.id, NodeStatus.Failed, error);
      failed.add(node.id);
      break;
    }
  }

  const finalStatus = failed.size > 0 ? WorkflowStatus.Failure : WorkflowStatus.Success;
  await markWorkflowStatus(ctx.runId, finalStatus);
}

async function markNodeStatus(
  _runId: string,
  _nodeId: string,
  _status: NodeStatus,
  _error?: unknown
): Promise<void> {
  // Persist node status and publish realtime event.
}

async function markWorkflowStatus(_runId: string, _status: WorkflowStatus): Promise<void> {
  // Persist workflow terminal status and publish final event.
}
