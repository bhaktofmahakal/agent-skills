"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

type WorkspaceShellProps = {
  left: ReactNode;
  main: ReactNode;
  right: ReactNode;
};

export function WorkspaceShell({ left, main, right }: WorkspaceShellProps) {
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="h-screen overflow-hidden bg-[#121212] text-white">
      <header className="flex h-12 items-center justify-between border-b border-white/10 px-3">
        <p className="text-xs uppercase tracking-[0.14em] text-white/50">Workspace</p>
        <button
          onClick={() => setRightOpen((v) => !v)}
          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
        >
          {rightOpen ? "Hide Run Panel" : "Show Run Panel"}
        </button>
      </header>

      <div className="flex h-[calc(100vh-3rem)]">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#161616] md:block">{left}</aside>
        <main className="min-h-0 flex-1 overflow-hidden">{main}</main>
        {rightOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="min-h-0 shrink-0 border-l border-white/10 bg-[#101010]"
          >
            {right}
          </motion.aside>
        )}
      </div>
    </div>
  );
}
