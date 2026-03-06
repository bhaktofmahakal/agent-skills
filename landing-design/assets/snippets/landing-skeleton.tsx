"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SectionShell } from "./section-shell";
import { HeroIsoBlocks } from "../svg/HeroIsoBlocks";
import { SectionSeparatorSystem } from "../svg/SectionSeparatorSystem";
import { BentoTilePrimitives } from "../svg/BentoTilePrimitives";

export default function LandingSkeleton() {
  const reduce = useReducedMotion();

  return (
    <main className="bg-[#151515] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#151515]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-center justify-between">
          <span className="font-medium">YourBrand</span>
          <nav className="hidden gap-6 text-sm text-white/75 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#templates" className="hover:text-white">Templates</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
          </nav>
          <Link
            href="/signup"
            className="rounded-[11px] bg-[#F04D26] px-3 py-1.5 text-sm font-medium hover:bg-[#de4723]"
          >
            Get Started
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#151515] pb-10 pt-16 md:pt-24">
        <div className="mx-auto grid w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-start gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              Build nonlinear workflows
              <br />
              with confidence.
            </h1>
            <p className="mt-5 max-w-xl text-base text-[#A1A1AA] md:text-lg">
              Production-grade automation with robust execution, visual clarity, and AI-native building blocks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-[11px] bg-[#F04D26] px-4 py-2 text-sm font-medium hover:bg-[#de4723]">
                Start Free
              </Link>
              <Link href="/docs" className="rounded-[11px] border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10">
                Explore Docs
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.85, ease: [0.23, 1, 0.32, 1], delay: 0.25 }}
            className="relative flex justify-center"
          >
            <HeroIsoBlocks className="max-w-[620px]" />
          </motion.div>
        </div>
      </section>

      <SectionSeparatorSystem />

      <SectionShell id="features" badge="Features" title="Everything needed to run serious automation">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.1fr]">
          <BentoTilePrimitives title="Connect your stack" description="Integrate APIs, internal tools, and communication platforms in one graph." />
          <div className="grid gap-4">
            <BentoTilePrimitives title="Reliable execution" description="Retries, checkpoints, and deterministic branching for live systems." compact />
            <BentoTilePrimitives title="AI-native steps" description="Use models for triage, summarization, and structured decision routing." compact />
          </div>
          <BentoTilePrimitives title="Template acceleration" description="Launch proven flows quickly and refine to fit your product operations." />
        </div>
      </SectionShell>

      <SectionSeparatorSystem compact />

      <SectionShell id="templates" badge="Templates" title="Ready-made workflows by function">
        <div className="rounded-[24px] border border-white/10 bg-[#1A1A1A] p-4 md:p-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              "AI & Automation",
              "Business",
              "DevOps",
              "Marketing",
            ].map((label) => (
              <button
                key={label}
                className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/80 hover:border-white/20 hover:bg-white/[0.06]"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-[18px] border border-white/10 bg-[#151515] p-4 text-sm text-white/65">
            Insert stacked template preview cards here (animate order/scale/opacity with Framer Motion).
          </div>
        </div>
      </SectionShell>

      <SectionSeparatorSystem />

      <SectionShell id="pricing" badge="Pricing" title="Plans that scale with your operations">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { name: "Free", price: "$0", featured: false },
            { name: "Pro", price: "$15", featured: true },
            { name: "Startup", price: "$38", featured: false },
          ].map((plan) => (
            <article
              key={plan.name}
              className={[
                "rounded-[20px] border p-6",
                plan.featured
                  ? "border-[#F04D26] bg-[#1A1A1A] shadow-[0_10px_28px_-18px_rgba(240,77,38,0.95)]"
                  : "border-white/10 bg-[#1A1A1A]",
              ].join(" ")}
            >
              <h3 className="text-lg font-medium">{plan.name}</h3>
              <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
              <p className="mt-4 text-sm text-[#A1A1AA]">Per month billed annually.</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <section className="py-16 md:py-24">
        <div className="mx-auto w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1200px] rounded-[28px] bg-gradient-to-br from-[#F04D26] to-[#E63D00] p-10 text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Ready to automate at scale?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/90">Ship reliable workflows faster with a visual system your team can trust.</p>
          <Link href="/signup" className="mt-8 inline-flex rounded-[12px] bg-white px-5 py-3 font-semibold text-[#F04D26] hover:bg-white/90">
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
