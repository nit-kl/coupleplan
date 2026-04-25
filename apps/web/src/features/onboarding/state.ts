import type { OnboardingMode, OnboardingState } from "./types";

export function createOnboardingState(): {
  get: () => OnboardingState;
  setMode: (mode: OnboardingMode) => void;
  setAccessToken: (token: string) => void;
  setInviteCode: (code: string) => void;
  setLastOtpCode: (code: string) => void;
} {
  const state: OnboardingState = {
    mode: "inviter",
    accessToken: "",
    inviteCode: "",
    lastOtpCode: "",
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
    setLastOtpCode: (code: string) => {
      state.lastOtpCode = code;
    },
  };
}
