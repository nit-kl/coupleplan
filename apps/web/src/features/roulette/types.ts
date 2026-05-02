export type PlanCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

export type RouletteVoteValue = "like" | "pass";

export type RouletteVoteSubmission = {
  planId: string;
  vote: RouletteVoteValue;
};

export type RouletteSessionStatus = "collecting" | "ready" | "decided";

export type RouletteResultView = {
  selectedPlanId: string;
  selectedPlan: PlanCard;
  decidedAt: string;
};

export type RouletteSessionView = {
  sessionId: string;
  status: RouletteSessionStatus;
  totalPlans: number;
  partners: {
    me: { userId: string; voted: number; completed: boolean };
    partner: { userId: string; completed: boolean };
  };
  matchedPlanIds: string[];
  matchThreshold: number;
  myVotes: RouletteVoteSubmission[];
  result?: RouletteResultView;
};

export type RouletteScreen =
  | "swipe"
  | "wait"
  | "match"
  | "spin"
  | "result";
