# Workspace IA Grammar

## Structural Baseline

Use this default workspace structure:

1. Shell layer
- Auth sidebar + compact header.
- Route-aware toggle into immersive mode for active builder routes.

2. Main build pane
- Canvas/editor/file grid/graph area.
- Primary command surface and contextual actions.

3. Observe pane
- Run list + run detail + node/event timeline.
- Collapsible or toggleable, but always reachable.

4. Overlay layer
- Drawers for component/node insertion.
- Dialogs for critical confirmation and setup.

## Information Hierarchy

- Primary: current artifact (workflow/file/project) and execution state.
- Secondary: recent runs, node statuses, quick diagnostics.
- Tertiary: metadata timestamps, counters, and hints.

## Pane Strategy

- Desktop:
  - at least two visible panes (build + observe)
  - optional nav pane persistent
- Tablet:
  - compress nav and allow pane toggling
- Mobile:
  - use reduced builder mode or explicit unsupported state for complex editors

## Command Surface

- Place high-frequency actions near cursor focus area.
- Add context menu for secondary actions.
- Expose keyboard equivalents for add, duplicate, tidy, run, and focus-switch.

## Visual Discipline

- Dark surfaces with subtle borders and controlled accent use.
- Keep dense content readable via clear section dividers and label hierarchy.
- Avoid oversized chrome; maximize useful working area.
