"use client";

import { motion, useReducedMotion } from "framer-motion";

type BentoTilePrimitivesProps = {
  title: string;
  description: string;
  compact?: boolean;
};

export function BentoTilePrimitives({ title, description, compact = false }: BentoTilePrimitivesProps) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -2 }}
      transition={reduce ? { duration: 0 } : { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className={[
        "bg-[#1A1A1A] p-[5px]",
        compact ? "rounded-[34px]" : "rounded-[42px]",
      ].join(" ")}
    >
      <div className={[
        "border border-white/10 p-[2px]",
        compact ? "rounded-[31px]" : "rounded-[39px]",
      ].join(" ")}>
        <div className={[
          "overflow-hidden border border-white/5 bg-[#111111]",
          compact ? "rounded-[28px] min-h-[230px]" : "rounded-[36px] min-h-[420px]",
        ].join(" ")}>
          <div className="relative h-[58%] min-h-[130px] border-b border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(240,77,38,0.18),transparent_55%)]">
            <div className="absolute inset-0 grid place-items-center">
              <svg viewBox="0 0 220 130" className="h-32 w-56" aria-hidden="true">
                <path d="M40 84 82 60l42 24-42 24z" fill="#111111" stroke="#FFFFFF" strokeDasharray="4 4" />
                <path d="M96 56 138 32l42 24-42 24z" fill="#111111" stroke="#FFFFFF" strokeDasharray="4 4" />
                <path d="M82 60v48M124 84v24M138 32v48" stroke="#FFFFFF" opacity="0.45" />
                <rect x="118" y="80" width="8" height="8" rx="2" fill="#F04D26" />
              </svg>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xl text-white md:text-2xl">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#7D7D87] md:text-base">{description}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
