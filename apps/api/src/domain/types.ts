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
