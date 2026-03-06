import { NextResponse } from "next/server";

const TOKEN_TTL_SECONDS = 5 * 60;

type Session = {
  user?: {
    id?: string;
  } | null;
} | null;

type RunOwnershipRecord = {
  id: string;
  ownerUserId: string;
} | null;

type ResolveParams = {
  request: Request;
  runId: string;
};

export async function issueExecutionStreamToken(
  input: ResolveParams,
  deps: {
    isExecutionBlocked: () => boolean;
    getSession: () => Promise<Session>;
    getRun: (runId: string) => Promise<RunOwnershipRecord>;
    signToken: (payload: { runId: string; userId: string; ttlSeconds: number }) => string;
    resolveWsUrl: (request: Request) => string;
  }
) {
  if (deps.isExecutionBlocked()) {
    return NextResponse.json(
      { error: "Execution streaming is disabled in this runtime mode." },
      { status: 503 }
    );
  }

  const session = await deps.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const run = await deps.getRun(input.runId);
  if (!run || run.ownerUserId !== userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const token = deps.signToken({
    runId: input.runId,
    userId,
    ttlSeconds: TOKEN_TTL_SECONDS,
  });

  return NextResponse.json({
    token,
    wsUrl: deps.resolveWsUrl(input.request),
    expiresInSeconds: TOKEN_TTL_SECONDS,
  });
}
