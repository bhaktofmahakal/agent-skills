# Source Pattern Map

Use this map first. It converts concrete workspace behaviors into reusable product rules.

## Route-Aware Workspace Shell

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/app/home/layout.tsx` | Detect workflow editor route and switch to `h-screen` + overflow-hidden mode. | Use route-aware layout modes for immersive builder surfaces. |
| `apps/web/components/layout/app-sidebar.tsx` | Stable post-auth nav IA with prefetch of high-frequency routes. | Keep workspace shell predictable and optimize route transitions. |

## Build Surface And Action Wiring

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/contexts/EditorContext.tsx` | Central context for node actions, run actions, status map, and edit capability flags. | Expose workspace capabilities through one context contract used by all panes/widgets. |
| `apps/web/app/home/workflows/[id]/hooks/useWorkflowCanvasActions.ts` | Controlled graph mutations with save triggers and guard rails (manual trigger uniqueness, template constraints). | Wrap all mutations in safe action hooks that coordinate persistence and invariants. |
| `apps/web/components/workflows/canvas/WorkflowCanvas.tsx` | Execution CTA states, context menu shortcuts, tidy action, lock/unlock interaction mode. | Keep command surfaces close to canvas and support both pointer and keyboard workflows. |

## Observe Surface (Run Panel)

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/app/home/workflows/[id]/components/RunPanel.tsx` | Split between run list and run detail with live node status, output expansion, and polling indicator. | Use side telemetry pane with hierarchy: run summary -> node detail -> output/error drilldown. |
| `apps/web/app/home/workflows/[id]/hooks/useWorkflowExecution.ts` | Panel state synced with socket events and fallback polling intervals. | Model observe pane as resilient state machine, not direct socket stream rendering. |
| `apps/web/app/home/executions/page.tsx` | Mobile pills + desktop split layout for workflow/run navigation. | Adapt workspace navigation patterns per viewport while preserving core observability loop. |

## Realtime Connection Reliability

| Source | Concrete Pattern | Reusable Rule |
| --- | --- | --- |
| `apps/web/lib/executions/executionSocketClient.ts` | Token priming, socket URL candidate fallback, reconnect backoff, per-run subscription map. | Build client transport layer that tolerates endpoint mismatch, token expiry, and transient disconnects. |
| `apps/web/lib/executions/useExecutionSocket.ts` | Hook wrapper for stream lifecycle with enabled flags. | Keep stream binding composable and opt-in by panel/run state. |
| `apps/realtime/src/index.ts` | WS relay with signed token verification, idle timeout, ping/pong, terminal auto-close. | Keep realtime server stateless and run-scoped, with strict connection lifecycle controls. |

## Transfer Guidance

- `clone`: keep dark compact UI, left nav shell, center build pane, right run telemetry pane.
- `adapt`: preserve interaction loop and reliability layers, retheme and rename primitives.
- `upgrade`: avoid complete rewrite first; migrate command/actions and observe reliability before visual polish.
