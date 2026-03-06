# Dashboard UX Grammar

## Core Principles

- Prioritize operational clarity over decorative complexity.
- Keep dark surfaces with controlled contrast and one strong accent.
- Make high-frequency actions obvious and low-latency.
- Show loading, empty, and failure states as first-class UI.

## Page Architecture

Use this baseline structure for post-auth pages:

1. Shell:
- Persistent sidebar + top context header.
- Route-aware layout behavior (normal dashboard vs full-height editor surfaces).

2. Title block:
- `h1` + one supporting sentence.
- One primary CTA when it exists.

3. Utility strip:
- Search, filters, tabs, usage bars, or status chips.
- Keep controls compact and scannable.

4. Primary content zone:
- Grid/list/table/split view based on task.
- Always include empty state behavior.

5. Secondary overlays:
- Dialogs for destructive actions.
- Drawers/sheets for detail views.

## Visual Language

- Surface rhythm: `bg-card` + subtle border + gradient wash for cards.
- Accent strategy: reserve brand/orange for primary actions and high-signal badges.
- Typography:
  - Headline: strong and short.
  - Meta: compact, subdued, scannable.
  - Labels: uppercase micro-labels only where density requires it.

## Interaction Grammar

- Use optimistic updates for create/delete/rename when backend contract allows rollback.
- Keep hover transforms restrained (`y` lift, mild shadow increase).
- Use status chips with shape+color+text (never color only).
- Prefer in-place edit patterns for frequent rename actions.

## Motion Grammar (Authenticated Surfaces)

- Entry: short fade/slide (`0.15s` to `0.24s`).
- Card stagger: small delays (`0.03s` to `0.06s`) with hard cap to avoid long cascades.
- Hover: springy but tight (`stiffness` high, `damping` moderate).
- Fallback:
  - Disable or reduce stagger when reduced-motion is enabled.
  - Keep state changes perceptible with opacity/outline even when motion is removed.

## Responsive Patterns

- Desktop: sidebar + content split.
- Tablet: same IA with reduced density.
- Mobile:
  - Replace left nav lists with pill strips or compact selectors.
  - Convert wide tables to stacked cards.
  - Keep key actions reachable in first viewport.

## States Checklist

Each page must define:

- Loading skeleton strategy.
- Empty state with next-step CTA.
- Error state with retry action.
- Filtered-empty state (different from no-data empty).
- Destructive confirmation state.

## Accessibility Checklist

- Keyboard support for all primary actions.
- Visible focus rings on dark surfaces.
- Text contrast preserved for muted metadata.
- Status badges not color-only.
- Dialogs and sheets have clear titles/descriptions.
