"use client";

import { useMemo, useState } from "react";
import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import { motion } from "framer-motion";

type SaveState = "saved" | "saving" | "unsaved" | "error";

function SaveBadge({ state }: { state: SaveState }) {
  const tone =
    state === "saved"
      ? "text-emerald-300 border-emerald-500/30"
      : state === "saving"
        ? "text-sky-300 border-sky-500/30"
        : state === "unsaved"
          ? "text-amber-300 border-amber-500/30"
          : "text-red-300 border-red-500/30";

  return <span className={`rounded-md border px-2 py-1 text-xs ${tone}`}>Save: {state}</span>;
}

export function WorkflowEditorShell() {
  const [nodes] = useState<Node[]>([]);
  const [edges] = useState<Edge[]>([]);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [saveState] = useState<SaveState>("saved");

  const canExecute = useMemo(() => nodes.length > 0, [nodes.length]);

  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-0 flex-col bg-[#151515]">
        <header className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/45">Workflow Editor</p>
            <h2 className="text-sm font-semibold text-white">Untitled Workflow</h2>
          </div>
          <div className="flex items-center gap-2">
            <SaveBadge state={saveState} />
            <button
              type="button"
              onClick={() => setRunPanelOpen((v) => !v)}
              className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Toggle Runs
            </button>
            <button
              type="button"
              disabled={!canExecute}
              className="rounded-md bg-[#f04d26] px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Execute
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="relative min-h-0 flex-1 border-r border-white/10">
            <div className="absolute inset-0 grid place-items-center text-sm text-white/40">
              Replace this area with your React Flow canvas, drawer, and node config overlays.
            </div>
          </div>

          {runPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="min-h-0 shrink-0 overflow-hidden bg-[#101010]"
            >
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Run Panel</p>
                <p className="text-sm text-white">Live execution timeline</p>
              </div>
              <div className="p-4 text-xs text-white/60">
                Add run list, run detail, socket status, and node status stream here.
              </div>
            </motion.aside>
          )}
        </div>

        <footer className="border-t border-white/10 px-4 py-2 text-xs text-white/45">
          Nodes: {nodes.length} | Edges: {edges.length}
        </footer>
      </div>
    </ReactFlowProvider>
  );
}
