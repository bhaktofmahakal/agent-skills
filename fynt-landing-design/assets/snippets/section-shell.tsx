"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type SectionShellProps = {
  id: string;
  badge: string;
  title: string;
  children: ReactNode;
};

export function SectionShell({ id, badge, title, children }: SectionShellProps) {
  const reduce = useReducedMotion();

  return (
    <section id={id} className="relative min-h-screen bg-[#151515] py-16 md:py-20">
      <div className="mx-auto w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.55 }}
          transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto mb-10 flex w-fit items-center gap-2 rounded-[11px] border border-[#F04D26] bg-[#F04D26]/5 px-2.5 text-xs font-medium text-white/75"
        >
          <span>{badge}</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.55 }}
          transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
          className="mb-12 text-center font-serif text-2xl italic text-[#7D7D87] md:text-3xl"
        >
          {title}
        </motion.h2>

        {children}
      </div>
    </section>
  );
}
