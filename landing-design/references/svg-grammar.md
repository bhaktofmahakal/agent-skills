# SVG Grammar

## Scope

Use this document for hero illustration systems, section separators, isometric motifs, and depth/contrast rules.

## Source Anchors

- `apps/web/components/landing-page/hero-illustrations/Hero-svg-fynt.tsx`
- `apps/web/components/landing-page/hero-illustrations/Hero-svg-middle.tsx`
- `apps/web/components/landing-page/hero-illustrations/Hero-svg-bottom.tsx`
- `apps/web/components/landing-page/hero-illustrations/Hero-svg-fynt-block.tsx`
- `apps/web/components/landing-page/hero/SectionSeparators.tsx`
- `apps/web/components/landing-page/templates/TemplatesSection.tsx`
- `apps/web/components/landing-page/bento-grid/F1Integrations.tsx`

## 1) Visual DNA

SVG language is structured, geometric, and layered.

Primary motifs:

- Isometric block assemblies.
- Connector lines and node endpoints.
- Repeated square node markers.
- Bridge separators with anchored orange terminals.

Avoid replacing these with generic blob backgrounds.

## 2) Hero Illustration Construction

Build hero SVG as a system of parts, not one flat shape:

1. Base lattice or platform plane.
2. Mid structural geometry (isometric cubes/cards).
3. Foreground branded block motifs.
4. Connector lines with dashed segments where needed.
5. Accent points in orange for attention control.

Depth cues:

- Layering via overlap and z-order.
- Controlled opacity bands (`0.6` range for lower depth layers).
- Edge strokes to preserve shape readability on dark backgrounds.

## 3) Separator Motifs

Two classes of separators:

- Linear separators with node terminals and center emblem.
- Curved bridge separators used around high-value sections.

Rules:

- Keep separator stroke relatively subtle (`#666` to white alpha ranges).
- Keep node blocks saturated (orange) to act as punctuation.
- Use symmetry unless the section intentionally breaks symmetry.

## 4) Stroke/Fill Grammar

Baseline strategy:

- Dark fills for body surfaces.
- Light strokes for edge readability.
- Accent orange only on focused paths, not global fill.

Recommended contrast structure:

- Surface: `#111111` to `#1E1E1E`
- Stroke: white/gray with alpha where needed
- Accent: `#F04D26`

## 5) Isometric Pattern Rules

- Prefer repeated matrix-like transforms and angular consistency.
- Keep perspective coherent across neighboring elements.
- If introducing new isometric blocks, align stroke thickness and corner logic.

## 6) Interaction on SVG

Allowed:

- Subtle hover glows on specific nodes.
- Small state changes (translate/rotate few degrees).
- Limited loop accents.

Not allowed:

- Full-scene chaotic transforms.
- Continuous high-frequency motion on every path.

## 7) Reusability Strategy

For generated projects, split SVG into reusable units:

- `HeroIsoBlocks`
- `SectionSeparatorSystem`
- `BentoTilePrimitives`

See assets:

- [../assets/svg/HeroIsoBlocks.tsx](../assets/svg/HeroIsoBlocks.tsx)
- [../assets/svg/SectionSeparatorSystem.tsx](../assets/svg/SectionSeparatorSystem.tsx)
- [../assets/svg/BentoTilePrimitives.tsx](../assets/svg/BentoTilePrimitives.tsx)

## 8) Clone vs Adapt

`clone`:

- Maintain dark industrial/isometric character.
- Preserve orange-terminal motif and node punctuation.

`adapt`:

- Preserve composition grammar and depth logic.
- Retheme fills/strokes/accent to brand token set.
- Keep geometric rigor even if brand is softer.

## 9) Hard Anti-Patterns

Reject output if it contains:

- Flat icon rows pretending to be hero illustration.
- Random stock SVGs without geometric coherence.
- Excessive glow and blur destroying edge clarity.
- Accent color saturation spread across all paths.
