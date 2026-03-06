"use client";

import { useEffect, useState } from "react";

type StatusMode = "socket" | "polling" | "idle";

type UseRealtimeStatusParams = {
  runId: string | null;
  runActive: boolean;
  socketConnected: boolean;
  workflowTerminal: boolean;
};

export function useRealtimeStatusMode({
  runId,
  runActive,
  socketConnected,
  workflowTerminal,
}: UseRealtimeStatusParams): StatusMode {
  const [mode, setMode] = useState<StatusMode>("idle");

  useEffect(() => {
    if (!runId || !runActive || workflowTerminal) {
      setMode("idle");
      return;
    }
    if (socketConnected) {
      setMode("socket");
      return;
    }
    setMode("polling");
  }, [runId, runActive, socketConnected, workflowTerminal]);

  return mode;
}
