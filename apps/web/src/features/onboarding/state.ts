import { setAccessToken as setSharedAccessToken } from "../../shared/session/sessionStore";
import type { CoupleMeResponse, OnboardingMode, OnboardingState, UserProfile } from "./types";

export function createOnboardingState(): {
  get: () => OnboardingState;
  setMode: (mode: OnboardingMode) => void;
  setAccessToken: (token: string) => void;
  setInviteCode: (code: string) => void;
  setOtpRequestedEmail: (email: string) => void;
  setUser: (user: UserProfile | undefined) => void;
  setCouple: (couple: CoupleMeResponse | undefined) => void;
  resetSession: () => void;
} {
  const state: OnboardingState = {
    mode: "inviter",
    accessToken: "",
    inviteCode: "",
    otpRequestedEmail: "",
  };

  return {
    get: () => ({ ...state }),
    setMode: (mode: OnboardingMode) => {
      state.mode = mode;
    },
    setAccessToken: (token: string) => {
      state.accessToken = token;
      setSharedAccessToken(token);
    },
    setInviteCode: (code: string) => {
      state.inviteCode = code;
    },
    setOtpRequestedEmail: (email: string) => {
      state.otpRequestedEmail = email;
    },
    setUser: (user: UserProfile | undefined) => {
      state.user = user;
    },
    setCouple: (couple: CoupleMeResponse | undefined) => {
      state.couple = couple;
    },
    resetSession: () => {
      state.accessToken = "";
      state.inviteCode = "";
      state.otpRequestedEmail = "";
      state.user = undefined;
      state.couple = undefined;
      setSharedAccessToken("");
    },
  };
}
