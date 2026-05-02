import type { PlanCard, RouletteSessionView, RouletteVoteSubmission } from "./types";

export type RouletteState = {
  plans: PlanCard[];
  pendingVotes: Map<string, RouletteVoteSubmission["vote"]>;
  cursor: number;
  session?: RouletteSessionView;
};

export function createRouletteState(): {
  get: () => RouletteState;
  setPlans: (plans: PlanCard[]) => void;
  setSession: (session: RouletteSessionView | undefined) => void;
  setVote: (planId: string, vote: RouletteVoteSubmission["vote"]) => void;
  setCursor: (cursor: number) => void;
  pendingVotesArray: () => RouletteVoteSubmission[];
  clearPending: () => void;
  reset: () => void;
} {
  const state: RouletteState = {
    plans: [],
    pendingVotes: new Map(),
    cursor: 0,
  };

  return {
    get: () => state,
    setPlans: (plans) => {
      state.plans = plans;
      state.cursor = 0;
      state.pendingVotes.clear();
    },
    setSession: (session) => {
      state.session = session;
    },
    setVote: (planId, vote) => {
      state.pendingVotes.set(planId, vote);
    },
    setCursor: (cursor) => {
      state.cursor = cursor;
    },
    pendingVotesArray: () =>
      Array.from(state.pendingVotes.entries()).map(([planId, vote]) => ({ planId, vote })),
    clearPending: () => {
      state.pendingVotes.clear();
    },
    reset: () => {
      state.plans = [];
      state.pendingVotes.clear();
      state.cursor = 0;
      state.session = undefined;
    },
  };
}
