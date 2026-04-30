export const screenIds = ["start", "profile", "login", "pair", "done", "home"] as const;

export type ScreenId = (typeof screenIds)[number];

/** オンボーディングの役割（2アカウント想定） */
export type OnboardingMode = "inviter" | "invitee";

export type OnboardingState = {
  mode: OnboardingMode;
  accessToken: string;
  inviteCode: string;
  otpRequestedEmail: string;
  user?: UserProfile;
  couple?: CoupleMeResponse;
};

export type OtpRequestResponse = {
  debugCode?: string;
};

export type OtpVerifyResponse = {
  accessToken: string;
  user: UserProfile;
  refreshExpiresInSec?: number;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt?: string;
};

export type InviteIssueResponse = {
  code: string;
};

export type CoupleMeResponse = {
  id: string;
  status: "pending" | "active" | "unpaired";
  members: { userId: string; role: string }[];
};

export type AccountDeletionResponse = {
  deleted: true;
  deletedUserIds: string[];
  deletedCoupleId?: string;
};
