# Source Pattern Map

## Purpose

Map concrete landing-page patterns from this codebase to reusable rules for `clone`, `adapt`, and `upgrade` modes.

## Mapping Table

| Source (Concrete) | Observed Pattern | Reusable Rule | Mode Notes |
|---|---|---|---|
| `app/page.tsx` | Long-form section stack with repeated shared container widths | Keep one global section rhythm and container system across page | All modes |
| `hero/EditorialLines.tsx` | Fixed left/right vertical editorial rails on desktop | Use persistent frame lines to tie sections together | Clone, Adapt |
| `header/SideLine.tsx` | Horizontal rails terminate in small orange node squares | Use rail + node motifs as structural punctuation | Clone |
| `hero/SectionSeparators.tsx` | Centered separator assembly with logo and node terminals | Insert separators between major narrative blocks | All modes |
| `hero/HeroContent.tsx` | Two-column hero desktop, compressed visual mobile | Hero must reflow by breakpoint without losing hierarchy | All modes |
| `hero/HeroContent.tsx` | Serif display headline with muted supporting copy | Combine expressive display with practical body text | All modes |
| `hero/HeroAnimation.tsx` | Layered top/middle/bottom SVG with connecting dashed lines | Compose hero visuals from multiple coordinated SVG strata | Clone, Adapt |
| `hero/HeroAnimation.tsx` | Coordinated reveal timing (`0.85s`, delayed sequence) | Use one clear hero entrance choreography | Clone |
| `bento-grid/BentoGrid.tsx` | Asymmetrical 3-column bento with center stack | Avoid uniform card grids for feature storytelling | All modes |
| `bento-grid/BentoGrid.tsx` | Triple-shell card framing (outer/mid/inner) | Build depth through nested shells and subtle border contrast | Clone, Adapt |
| `bento-grid/F1Integrations.tsx` | Isometric tile matrix with dashed stroke cells | Use geometric SVG micro-worlds inside feature cards | Clone, Adapt |
| `bento-grid/F2WorkflowRunning.tsx` | Hover-triggered micro motion and rotating icon detail | Keep interactions tactile but bounded in scope | All modes |
| `bento-grid/F2WorkflowRunning.tsx` | `useReducedMotion()` gates hover/rotation behavior | Gate all non-essential animation when reduced motion is preferred | All modes |
| `bento-grid/F3AIModels.tsx` | Small interactive lift states on grouped objects | Use tiny stateful transforms to signal interactivity | All modes |
| `bento-grid/F4Templates.tsx` | Layered stacked sheet motif with depth offsets | Represent content volume using stacked visual metaphor | Clone, Adapt |
| `templates/TemplatesSection.tsx` | Category tabs + stacked preview cards + CTA ticker | Pair filtering UI with visual stack transitions for discovery | All modes |
| `templates/TemplatesSection.tsx` | Motion tokens centralized (spring/ease constants) | Centralize motion values and reuse across section components | All modes |
| `templates/TemplatesSection.tsx` | Top and bottom curved bridge separators with node endpoints | Use mirrored separators to frame high-value modules | Clone, Adapt |
| `playground/DesktopPlayground.tsx` | Feature appears only on desktop via media query | Defer dense interactions on small screens; simplify mobile path | All modes |
| `playground/PlaygroundSection.tsx` | Product-in-context visual demonstration section | Include one section that proves product behavior, not just claims | All modes |
| `pricing/PricingSection.tsx` | Dark pricing cards with one highlighted mid-tier plan | Emphasize one primary conversion tier via contrast and accent | All modes |
| `faq/FAQSection.tsx` | High-legibility accordion with restrained transitions | Keep FAQ interaction simple and readable | All modes |
| `footer-cta/FooterCTA.tsx` | High-contrast warm CTA panel before footer | End with a decisive, high-signal conversion section | All modes |
| `footer-cta/Footer.tsx` | Reuse node/line separators in footer architecture | Carry motif language to footer for cohesion | Clone |
| `app/globals.css` + component classes | Dark foundation with restrained orange accent | Keep accent scarce and intentional; avoid over-saturation | All modes |
| `app/globals.css` | Global `prefers-reduced-motion` fallback | Always include CSS-level motion safety baseline | All modes |

## Transfer Rules

1. Keep pattern *roles* when adapting brands, even when colors/fonts change.
2. Preserve separator cadence and editorial framing; these carry structural identity.
3. Preserve handcrafted SVG depth logic; swap motif vocabulary only if equally rigorous.
4. In `upgrade` mode, prioritize structure + responsiveness + motion safety before visual polish.

## Anti-Pattern Mapping

- If a target page uses generic card grids only: introduce asymmetrical bento rhythm.
- If hero is text-only or stock-illustration-only: add structured SVG composition with layered depth.
- If motion is inconsistent: normalize to shared token sets and reduced-motion compliance.
- If sections feel disconnected: apply separator motifs and recurring node punctuation.
