export const DEFAULT_FOCUS_SECONDS = 12 * 60;

export type FocusSessionState = {
  seconds: number;
  running: boolean;
  done: boolean[];
  round: number;
  celebration: string;
  engaged: boolean;
};

export type FocusSessionAction =
  | { type: "engage" }
  | { type: "tick" }
  | { type: "toggle-running" }
  | { type: "shorten" }
  | { type: "reset" }
  | { type: "toggle-task"; index: number }
  | { type: "new-session" };

export function createFocusSessionState(): FocusSessionState {
  return {
    seconds: DEFAULT_FOCUS_SECONDS,
    running: false,
    done: [false, false, false],
    round: 0,
    celebration: "",
    engaged: false,
  };
}

export function focusSessionReducer(state: FocusSessionState, action: FocusSessionAction): FocusSessionState {
  switch (action.type) {
    case "engage":
      return state.engaged ? state : { ...state, engaged: true };
    case "tick":
      if (!state.running) return state;
      if (state.seconds <= 1) return { ...state, seconds: 0, running: false };
      return { ...state, seconds: state.seconds - 1 };
    case "toggle-running":
      if (state.seconds === 0) {
        return { ...state, seconds: DEFAULT_FOCUS_SECONDS, running: true, engaged: true, celebration: "" };
      }
      return { ...state, running: !state.running, engaged: true };
    case "shorten":
      return {
        ...state,
        seconds: Math.min(state.seconds, 5 * 60),
        running: false,
        engaged: true,
        celebration: "Timer set to five focused minutes.",
      };
    case "reset":
      return {
        ...state,
        seconds: DEFAULT_FOCUS_SECONDS,
        running: false,
        engaged: true,
        celebration: "Timer reset to 12 minutes.",
      };
    case "toggle-task": {
      const done = state.done.map((value, index) => index === action.index ? !value : value);
      const finished = done.every(Boolean);
      return {
        ...state,
        done,
        engaged: true,
        celebration: finished
          ? "Session complete. Nice work, you kept the promise to yourself."
          : done[action.index]
            ? "Nice. One small step finished."
            : "",
      };
    }
    case "new-session":
      return {
        seconds: DEFAULT_FOCUS_SECONDS,
        running: false,
        done: [false, false, false],
        round: state.round + 1,
        celebration: "A fresh session is ready.",
        engaged: true,
      };
    default:
      return state;
  }
}

export function formatFocusTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
