type TxClient = {
  usageRecord: {
    upsert: (input: unknown) => Promise<unknown>;
    updateMany: (input: unknown) => Promise<{ count: number }>;
    update: (input: unknown) => Promise<unknown>;
  };
  workflowRun: {
    count: (input: unknown) => Promise<number>;
    create: (input: unknown) => Promise<{ id: string }>;
    update: (input: unknown) => Promise<unknown>;
  };
};

type DbClient = {
  $transaction: <T>(input: ((tx: TxClient) => Promise<T>) | unknown[]) => Promise<T>;
};

type PlanLimits = {
  monthlyRunLimit: number;
  maxConcurrent: number;
};

export async function reserveRunAndEnqueue(params: {
  db: DbClient;
  enqueue: (jobId: string) => Promise<void>;
  rollback: (ctx: { runId: string; ownerUserId: string; monthKey: string }) => Promise<void>;
  ownerUserId: string;
  workflowId: string;
  monthKey: string;
  planLimits: PlanLimits;
  metadata: Record<string, unknown>;
}): Promise<{ runId: string }> {
  let runId = "";

  const run = await params.db.$transaction(async (tx) => {
    await tx.usageRecord.upsert({
      where: { userId_month: { userId: params.ownerUserId, month: params.monthKey } },
      create: { userId: params.ownerUserId, month: params.monthKey, runCount: 0 },
      update: {},
    });

    const pendingCount = await tx.workflowRun.count({
      where: {
        status: "Pending",
        workflow: { userId: params.ownerUserId },
      },
    });

    if (pendingCount >= params.planLimits.maxConcurrent) {
      throw new Error(`Concurrent workflow limit reached (${params.planLimits.maxConcurrent}).`);
    }

    if (params.planLimits.monthlyRunLimit !== -1) {
      const reserve = await tx.usageRecord.updateMany({
        where: {
          userId: params.ownerUserId,
          month: params.monthKey,
          runCount: { lt: params.planLimits.monthlyRunLimit },
        },
        data: { runCount: { increment: 1 } },
      });

      if (reserve.count === 0) {
        throw new Error(`Monthly execution limit reached (${params.planLimits.monthlyRunLimit}).`);
      }
    } else {
      await tx.usageRecord.update({
        where: { userId_month: { userId: params.ownerUserId, month: params.monthKey } },
        data: { runCount: { increment: 1 } },
      });
    }

    return tx.workflowRun.create({
      data: {
        workflowId: params.workflowId,
        metadata: params.metadata,
      },
    });
  });

  runId = run.id;

  try {
    await params.enqueue(runId);
    return { runId };
  } catch (error) {
    await params.rollback({
      runId,
      ownerUserId: params.ownerUserId,
      monthKey: params.monthKey,
    });

    throw error;
  }
}
