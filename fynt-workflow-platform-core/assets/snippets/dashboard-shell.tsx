"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Workflows", href: "/home", match: (p) => p === "/home" || p.startsWith("/home/workflows") },
  { label: "Credentials", href: "/home/credentials", match: (p) => p.startsWith("/home/credentials") },
  { label: "Executions", href: "/home/executions", match: (p) => p.startsWith("/home/executions") },
  { label: "Templates", href: "/home/templates", match: (p) => p.startsWith("/home/templates") },
];

function isEditorRoute(pathname: string): boolean {
  return pathname.includes("/home/workflows/") && pathname !== "/home/workflows";
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/home";
  const reduceMotion = useReducedMotion();
  const editorRoute = isEditorRoute(pathname);

  return (
    <div className={editorRoute ? "h-screen overflow-hidden bg-[#121212]" : "min-h-screen bg-[#121212]"}>
      <div className="flex h-full">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#161616] md:block">
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/45">Platform</p>
            <h1 className="mt-1 text-lg font-semibold text-white">Your Product</h1>
          </div>
          <nav className="space-y-1 p-2">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className={editorRoute ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex min-h-0 flex-1 flex-col"}>
          {!editorRoute && (
            <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 md:px-6">
              <p className="text-sm text-white/60">Dashboard</p>
              <button className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                Upgrade
              </button>
            </header>
          )}

          <motion.div
            className={editorRoute ? "min-h-0 flex-1 overflow-hidden" : "flex-1 p-4 md:p-6"}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
