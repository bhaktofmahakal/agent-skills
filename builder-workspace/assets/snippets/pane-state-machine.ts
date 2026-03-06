export type PaneId = "nav" | "main" | "observe";

export type PaneState = {
  navOpen: boolean;
  observeOpen: boolean;
  observeMode: "live" | "history";
  degradedRealtime: boolean;
};

export type PaneAction =
  | { type: "toggle-nav" }
  | { type: "toggle-observe" }
  | { type: "set-observe-mode"; mode: "live" | "history" }
  | { type: "realtime-degraded"; value: boolean };

export const initialPaneState: PaneState = {
  navOpen: true,
  observeOpen: true,
  observeMode: "live",
  degradedRealtime: false,
};

export function paneReducer(state: PaneState, action: PaneAction): PaneState {
  switch (action.type) {
    case "toggle-nav":
      return { ...state, navOpen: !state.navOpen };
    case "toggle-observe":
      return { ...state, observeOpen: !state.observeOpen };
    case "set-observe-mode":
      return { ...state, observeMode: action.mode };
    case "realtime-degraded":
      return { ...state, degradedRealtime: action.value };
    default:
      return state;
  }
}
