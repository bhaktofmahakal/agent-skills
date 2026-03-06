"use client";

import { motion, useReducedMotion } from "framer-motion";

type HeroIsoBlocksProps = {
  className?: string;
};

export function HeroIsoBlocks({ className }: HeroIsoBlocksProps) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 760 440"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect x="40" y="300" width="680" height="90" rx="8" fill="#1B1B1B" stroke="#6F6F6F" />

      <g opacity="0.72" stroke="#7F7F7F" fill="#141414">
        <path d="M130 250 220 198 310 250 220 302z" />
        <path d="M220 198v104" />
        <path d="M130 250v60l90 52v-60" />
        <path d="M310 250v60l-90 52" />
      </g>

      <g opacity="0.72" stroke="#7F7F7F" fill="#141414">
        <path d="M290 208 380 156 470 208 380 260z" />
        <path d="M380 156v104" />
        <path d="M290 208v60l90 52v-60" />
        <path d="M470 208v60l-90 52" />
      </g>

      <g opacity="0.72" stroke="#7F7F7F" fill="#141414">
        <path d="M450 248 540 196 630 248 540 300z" />
        <path d="M540 196v104" />
        <path d="M450 248v60l90 52v-60" />
        <path d="M630 248v60l-90 52" />
      </g>

      <path d="M220 302 380 260" stroke="#FFFFFF" strokeDasharray="7 7" opacity="0.55" />
      <path d="M380 260 540 300" stroke="#FFFFFF" strokeDasharray="7 7" opacity="0.55" />

      <rect x="214" y="294" width="12" height="12" rx="2" fill="#F04D26" />
      <rect x="374" y="254" width="12" height="12" rx="2" fill="#F04D26" />
      <rect x="534" y="294" width="12" height="12" rx="2" fill="#F04D26" />

      <motion.g
        initial={{ y: 0 }}
        animate={reduce ? { y: 0 } : { y: [-3, 2, -3] }}
        transition={reduce ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M363 130h44l-10 28h-44z" fill="#F04D26" stroke="#FFFFFF" />
        <path d="M407 130 420 138l-10 28-13-8z" fill="#D97757" stroke="#FFFFFF" />
        <path d="M353 158h44l13 8h-44z" fill="#E25028" stroke="#FFFFFF" />
      </motion.g>
    </svg>
  );
}
