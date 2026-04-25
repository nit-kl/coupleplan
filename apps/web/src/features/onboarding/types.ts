export const screenIds = ["start", "profile", "pair", "done", "home"] as const;

export type ScreenId = (typeof screenIds)[number];

/** オンボーディングの役割（2アカウント想定） */
export type OnboardingMode = "inviter" | "invitee";

export type OnboardingState = {
  mode: OnboardingMode;
  accessToken: string;
  inviteCode: string;
  lastOtpCode: string;
};

export type OtpRequestResponse = {
  debugCode?: string;
};

export type OtpVerifyResponse = {
  accessToken: string;
};

export type InviteIssueResponse = {
  code: string;
};

export type CoupleMeResponse = {
  id: string;
  status: "pending" | "active";
  members: { userId: string; role: string }[];
};
