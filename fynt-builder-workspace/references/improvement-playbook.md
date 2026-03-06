# Improvement Playbook

Use this for `mode=upgrade`.

## Upgrade Order

1. Shell and IA cleanup
- Introduce route-aware workspace mode.
- Normalize pane layout and nav behavior.

2. Action architecture cleanup
- Move direct mutations into action hooks/context.
- Add save and validation feedback states.

3. Observe loop cleanup
- Add run panel with list/detail model.
- Add node-level status and output/error drilldown.

4. Realtime resilience
- Add socket lifecycle states and fallback polling.
- Add explicit degraded-mode UI.

5. Keyboard and command layer
- Add core shortcuts and context menu parity.
- Protect editable fields from global shortcut collisions.

## Before/After Metrics

- Time from run start to first visible feedback.
- Successful run-debug cycles per session.
- Socket-drop recovery success rate.
- Editor command completion time (keyboard path).
- User-visible error clarity score.
