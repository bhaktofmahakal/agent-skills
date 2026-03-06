# Editor Grammar

## Editor Composition

Use a composed architecture:

- Canvas layer: React Flow nodes, edges, controls, minimap.
- Node library layer: drawer/palette for adding nodes.
- Node config layer: dialogs/panels for editing node data.
- Run telemetry layer: right-side run panel with node status timeline.
- Header layer: title edit, save state, usage counter, execute controls.

Do not collapse these into a single mega component.

## Graph State Rules

- Normalize incoming graph payloads to arrays before use.
- Sanitize nodes/edges before persistence (stable fields only).
- Validate graph shape on load and save.
- Keep a "last known valid graph" snapshot for recovery.
- Enforce template graph non-empty rules when template metadata exists.

## Persistence Rules

- Debounced autosave for normal edits.
- Immediate save for high-risk transitions (execute, structural rewrites, template apply).
- Explicit save status states: `unsaved`, `saving`, `saved`, `error`.
- Queue save operations to prevent out-of-order writes.

## History Rules

- Maintain bounded undo/redo stacks.
- Capture history only for persisted structural changes.
- Ignore keyboard shortcuts when target is editable input/textarea/contentEditable.

## Execution UX Rules

- Disable execute when validation errors exist.
- Distinguish:
  - full workflow run
  - single node run
  - trigger run-now for webhook/cron triggers
- For cron-active workflows, present explicit "active schedule" state, not generic execute.
- Open run panel automatically when run starts.

## Template Setup Rules

- For template workflows, preflight missing credential bindings and required fields.
- Auto-bind credentials only when platform match is unambiguous.
- Never overwrite existing valid credential assignments in fill-missing mode.
- Re-validate graph after template binding.

## Mobile Policy

- If editor is desktop-only, show explicit unsupported state with safe back navigation.
- Do not render partially broken canvas on small screens.

## Keyboard/Command Surface

- Required: add node, tidy layout, select all, clear selection, undo, redo.
- Keep command hints visible in context menus or shortcut overlays.
- Ensure command behavior is deterministic and reversible where possible.
