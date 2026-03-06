# Design Grammar

## Scope

Use this document for layout rhythm, section composition, spacing, typography, and bento/card structure.

## Source Anchors

- `apps/web/app/page.tsx`
- `apps/web/components/landing-page/hero/Hero.tsx`
- `apps/web/components/landing-page/hero/HeroContent.tsx`
- `apps/web/components/landing-page/hero/EditorialLines.tsx`
- `apps/web/components/landing-page/hero/SectionSeparators.tsx`
- `apps/web/components/landing-page/bento-grid/BentoGrid.tsx`
- `apps/web/components/landing-page/templates/TemplatesSection.tsx`
- `apps/web/components/landing-page/playground/PlaygroundSection.tsx`

## 1) Page Backbone

Compose in long-form vertical sections, not one giant hero.

Recommended section order:

1. Header with horizontal side rails.
2. Hero (copy + large SVG system).
3. Separator bridge.
4. Features with bento cluster.
5. Interactive product section (playground or visual demo).
6. Templates/usage proof section.
7. Pricing and FAQ.
8. Strong CTA and footer.

Keep each major section visually distinct but structurally connected by separators and line motifs.

## 2) Container Rhythm

Use a consistent centered container rhythm with width changes only at major breakpoints.

Reference pattern from source:

- `w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%]`
- max width around `1400px` to `1920px` depending on section role.

Rules:

- Hero can be wider than content sections.
- Content sections should align to same edge grid.
- Avoid sudden shifts in left/right margins between sections.

## 3) Editorial Frame System

Apply persistent editorial rails on large screens.

Pattern:

- Fixed left/right vertical lines near container edges.
- Small orange square nodes at meaningful intersections.

Use this to create continuity between independent sections.

## 4) Separator Language

Use separators as structural punctuation, not decoration only.

Required motifs:

- Horizontal line + node-square terminals.
- Center mark or logo-block anchor.
- Curved bridge separators around templates and FAQ zones.

Placement:

- Between major section transitions.
- At start/end of large interactive modules.
- Before footer clusters.

## 5) Hero Composition Rules

Hero must combine:

- High-contrast headline/subheadline block.
- Distinct CTA row.
- Large handcrafted SVG composition with depth layers.

Layout behavior:

- Mobile: copy first, compressed illustration below.
- Desktop: two-column split, illustration gets larger visual share.

Avoid:

- Tiny icon hero.
- Flat gradient-only background replacing SVG structure.

## 6) Bento/Feature Pattern

Use asymmetrical bento distribution instead of uniform card grids.

Canonical pattern:

- 3-column desktop skeleton with center stack.
- Rounded multi-ring shells (`outer -> mid -> inner`) to create depth.
- Card heights intentionally varied (tall/short/tall).

Card internals:

- Top interactive visual region.
- Bottom text block with concise value statement.
- Keep text concise; visual does primary persuasion.

## 7) Typography Hierarchy

Hierarchy intent:

- Serif/italic display moments for section identity and editorial tone.
- Sans body text for functional readability.
- Muted grays for supportive copy, white for key statements.

Rules:

- Do not style every heading in the same weight and size.
- Alternate expression: large confident hero -> softer italic section titles -> practical card copy.

## 8) Color and Contrast Structure

Base hierarchy:

- Primary canvas: near-black (`#151515` range).
- Card surfaces: slightly lifted darks (`#1A1A1A`, `#1E1E1E`).
- Accent: orange (`#F04D26`) reserved for key edges/actions.
- Supporting text: neutral grays (`#7D7D87`, `#A1A1AA`).

Rules:

- Use accent sparingly and intentionally.
- Do not make every control orange.
- Keep body contrast readable against dark background.

## 9) Responsive Composition Rules

Desktop:

- Preserve editorial rails and full separator systems.
- Use richer SVG density.

Tablet:

- Reduce horizontal density before collapsing to single column.

Mobile:

- Simplify separators while retaining motif identity.
- Reorder visuals for readability.
- Maintain clear action row and readable text line length.

## 10) Clone vs Adapt Behavior

`clone` mode:

- Preserve dark + orange hierarchy.
- Preserve editorial rails and node separators.
- Preserve bento density and isometric SVG influence.

`adapt` mode:

- Keep rhythm, spacing, and compositional grammar.
- Replace palette, iconography, and type expression for brand fit.
- Keep separator language concept even if shapes/colors change.

## 11) Hard Anti-Patterns

Reject output if it contains:

- Generic SaaS template grid with no section punctuation.
- Overuse of one card style across all sections.
- No visual depth layering.
- No consistent container rhythm.
- Copy-only hero without structural SVG support.
