import { requestJson } from "../../shared/api/httpClient";
import type { CoupleMeResponse, InviteIssueResponse, OtpRequestResponse, OtpVerifyResponse } from "./types";

export function requestOtp(email: string): Promise<OtpRequestResponse> {
  return requestJson<OtpRequestResponse>("/auth/otp/request", "POST", {
    body: { email },
  });
}

export function verifyOtp(email: string, code: string): Promise<OtpVerifyResponse> {
  return requestJson<OtpVerifyResponse>("/auth/otp/verify", "POST", {
    body: { email, code },
  });
}

export function updateProfile(accessToken: string, displayName: string): Promise<unknown> {
  return requestJson<unknown>("/users/me", "PATCH", {
    accessToken,
    body: { displayName },
  });
}

export function createCouple(accessToken: string): Promise<unknown> {
  return requestJson<unknown>("/couples", "POST", { accessToken });
}

export function issueInvite(accessToken: string): Promise<InviteIssueResponse> {
  return requestJson<InviteIssueResponse>("/couples/invites", "POST", { accessToken });
}

export function acceptInvite(accessToken: string, code: string): Promise<CoupleMeResponse> {
  return requestJson<CoupleMeResponse>(`/couples/invites/${encodeURIComponent(code)}/accept`, "POST", {
    accessToken,
  });
}

export function getMyCouple(accessToken: string): Promise<CoupleMeResponse> {
  return requestJson<CoupleMeResponse>("/couples/me", "GET", { accessToken });
}
