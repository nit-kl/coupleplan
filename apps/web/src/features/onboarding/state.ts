import type { OnboardingMode, OnboardingState } from "./types";

export function createOnboardingState(): {
  get: () => OnboardingState;
  setMode: (mode: OnboardingMode) => void;
  setAccessToken: (token: string) => void;
  setInviteCode: (code: string) => void;
  setOtpRequestedEmail: (email: string) => void;
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
    },
    setInviteCode: (code: string) => {
      state.inviteCode = code;
    },
    setOtpRequestedEmail: (email: string) => {
      state.otpRequestedEmail = email;
    },
  };
}
