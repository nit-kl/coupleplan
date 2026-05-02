export type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type CoupleStatus = "pending" | "active" | "unpaired";

export type Couple = {
  id: string;
  status: CoupleStatus;
  memberIds: string[];
  createdAt: string;
};

export type InviteStatus = "issued" | "used" | "expired" | "revoked";

export type Invite = {
  id: string;
  coupleId: string;
  code: string;
  status: InviteStatus;
  expiresAt: string;
  usedAt?: string;
};

export type OtpRequestRecord = {
  email: string;
  code: string;
  expiresAt: number;
};

export type CoupleMemberView = {
  userId: string;
  role: "owner" | "partner";
  joinedAt: string;
};

export type CoupleView = {
  id: string;
  status: CoupleStatus;
  members: CoupleMemberView[];
};

/** 静的カタログとして配信するルーレット用プランカード */
export type PlanCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

export type RouletteSessionStatus = "collecting" | "ready" | "decided";

export type RouletteSession = {
  id: string;
  coupleId: string;
  status: RouletteSessionStatus;
  startedAt: string;
  finishedAt?: string;
};

export type RouletteVoteValue = "like" | "pass";

export type RouletteVote = {
  sessionId: string;
  userId: string;
  planId: string;
  vote: RouletteVoteValue;
  createdAt: string;
};

export type RouletteResult = {
  id: string;
  sessionId: string;
  selectedPlanId: string;
  createdAt: string;
};

/** クライアント返却用の進捗情報。collecting 中は相手の vote 内容を含めない（ADR 0011） */
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
  myVotes: { planId: string; vote: RouletteVoteValue }[];
  result?: { selectedPlanId: string; selectedPlan: PlanCard; decidedAt: string };
};
