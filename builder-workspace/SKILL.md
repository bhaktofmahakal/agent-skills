---
name: fynt-builder-workspace
description: "Build and upgrade production builder workspaces in a Fynt-inspired style using route-aware shells, split panes, editor context wiring, command surfaces, and realtime run-status feedback loops. Use when designing or refactoring replit/opencode-style product experiences, post-auth build/run/observe workflows, execution side panels, or keyboard-first workspace interactions."
---

# Fynt Builder Workspace

Use this skill to create high-utility workspace UX where users build, run, and observe in one tight loop.

## Invocation Contract

- `$fynt-builder-workspace mode=clone`
- `$fynt-builder-workspace mode=adapt`
- `$fynt-builder-workspace mode=upgrade`

If mode is missing, default to `adapt`.

## Mode Behavior

- `clone`: stay close to Fynt workspace DNA (dark shell, sidebar IA, full-height editor route, run panel, realtime status).
- `adapt`: preserve workspace mechanics while retheming and remapping to your product.
- `upgrade`: transform existing workspace UX with measurable flow, clarity, and reliability gains.

## Required Output Contract

Always include:

1. Workspace IA map (shell, panes, overlays, route states).
2. Build/run/observe interaction loop design.
3. Pane behavior plan (open/close/resize/persist + mobile policy).
4. Command and shortcut plan (context menu, keyboard, quick actions).
5. Realtime status plan (socket lifecycle + fallback to polling).
6. State model for loading, empty, partial, error, and degraded realtime.
7. Accessibility and performance checks.
8. Rubric scorecard with pass/fail.

Do not finalize without a pass from [references/quality-rubric.md](references/quality-rubric.md).

## Workflow

1. Read [references/source-pattern-map.md](references/source-pattern-map.md) first.
2. Load only needed references:
   - [references/workspace-ia-grammar.md](references/workspace-ia-grammar.md)
   - [references/interaction-loop-grammar.md](references/interaction-loop-grammar.md)
   - [references/realtime-feedback-grammar.md](references/realtime-feedback-grammar.md)
   - [references/state-and-resilience-grammar.md](references/state-and-resilience-grammar.md)
   - [references/improvement-playbook.md](references/improvement-playbook.md) for `upgrade`
   - [references/quality-rubric.md](references/quality-rubric.md)
3. Reuse assets when code is requested:
   - [assets/snippets/workspace-shell.tsx](assets/snippets/workspace-shell.tsx)
   - [assets/snippets/pane-state-machine.ts](assets/snippets/pane-state-machine.ts)
   - [assets/snippets/realtime-status-hook.ts](assets/snippets/realtime-status-hook.ts)
   - [assets/snippets/command-surface.tsx](assets/snippets/command-surface.tsx)
4. Run strict rubric scoring and iterate until pass.

## Non-Negotiables

- Keep route-aware full-height behavior for workspace/editor routes.
- Keep split-pane ergonomics and clear state boundaries.
- Use realtime as primary status channel with robust fallback behavior.
- Make command surface keyboard-first without breaking editable fields.
- Keep mobile behavior explicit (supported reduced mode or graceful unsupported state).

## Anti-Patterns To Reject

- Generic dashboard layout pretending to be a builder workspace.
- No run telemetry panel or hidden execution feedback.
- Socket-only status design with no recovery strategy.
- Context actions that are mouse-only with no keyboard mapping.
- Missing loading/empty/error/degraded states for core panes.
