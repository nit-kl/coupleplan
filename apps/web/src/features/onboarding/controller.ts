import { HttpError } from "../../shared/api/httpClient";
import {
  acceptInvite,
  createCouple,
  getMyCouple,
  issueInvite,
  requestOtp,
  updateProfile,
  verifyOtp,
} from "./api";
import { createOnboardingState } from "./state";
import {
  applyPairMode,
  onClick,
  setInviteCode,
  setPairHeadlines,
  setProfileModeHint,
  setStatus,
  showError,
  showScreen,
  valueOf,
} from "./view";
import type { OnboardingMode } from "./types";

function isAlreadyInCoupleError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.message.includes("already in couple");
  }
  return false;
}

function goToProfile(state: ReturnType<typeof createOnboardingState>, mode: OnboardingMode): void {
  state.setMode(mode);
  setProfileModeHint(mode);
  showScreen("profile");
}

/** 招待側: カップル作成 + 招待コード発行 */
async function initializeSessionInviter(state: ReturnType<typeof createOnboardingState>): Promise<void> {
  const email = valueOf("email");
  const displayName = valueOf("display-name");
  if (!email || !displayName) {
    throw new Error("メールアドレスと表示名を入力してください");
  }

  const otpRequested = await requestOtp(email);
  state.setLastOtpCode(otpRequested.debugCode ?? "");

  const verified = await verifyOtp(email, state.get().lastOtpCode);
  state.setAccessToken(verified.accessToken);

  await updateProfile(state.get().accessToken, displayName);

  try {
    await createCouple(state.get().accessToken);
  } catch (error) {
    if (!isAlreadyInCoupleError(error)) throw error;
  }

  const invite = await issueInvite(state.get().accessToken);
  state.setInviteCode(invite.code);
  setInviteCode(state.get().inviteCode);
  setStatus({
    flow: "inviter_ready",
    email,
    displayName,
    inviteCode: state.get().inviteCode,
    debugOtp: state.get().lastOtpCode,
  });
}

/** 被招待側: プロフィールまで（カップル未作成） */
async function initializeSessionInvitee(state: ReturnType<typeof createOnboardingState>): Promise<void> {
  const email = valueOf("email");
  const displayName = valueOf("display-name");
  if (!email || !displayName) {
    throw new Error("メールアドレスと表示名を入力してください");
  }

  const otpRequested = await requestOtp(email);
  state.setLastOtpCode(otpRequested.debugCode ?? "");

  const verified = await verifyOtp(email, state.get().lastOtpCode);
  state.setAccessToken(verified.accessToken);

  await updateProfile(state.get().accessToken, displayName);

  setStatus({
    flow: "invitee_ready",
    email,
    displayName,
    debugOtp: state.get().lastOtpCode,
  });
}

export function startOnboardingController(): void {
  const state = createOnboardingState();

  onClick("go-inviter", () => goToProfile(state, "inviter"));
  onClick("go-invitee", () => goToProfile(state, "invitee"));
  onClick("back-start", () => showScreen("start"));
  onClick("back-profile", () => showScreen("profile"));
  onClick("go-home", () => showScreen("home"));

  onClick("go-pair", async () => {
    try {
      const mode = state.get().mode;
      if (mode === "inviter") {
        await initializeSessionInviter(state);
      } else {
        await initializeSessionInvitee(state);
      }
      applyPairMode(mode);
      setPairHeadlines(mode);
      showScreen("pair");
    } catch (error) {
      showError(error);
    }
  });

  onClick("reissue-code", async () => {
    try {
      if (state.get().mode !== "inviter") return;
      const invite = await issueInvite(state.get().accessToken);
      state.setInviteCode(invite.code);
      setInviteCode(state.get().inviteCode);
      setStatus({ flow: "reissued", inviteCode: state.get().inviteCode });
    } catch (error) {
      showError(error);
    }
  });

  onClick("copy-invite-code", async () => {
    const code =
      state.get().inviteCode ||
      ((document.getElementById("invite-code") as HTMLDivElement | null)?.textContent?.trim() ?? "");
    if (!code || code === "CP----") {
      showError(new Error("コピーできるコードがありません"));
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setStatus({ flow: "clipboard", copied: code });
    } catch {
      showError(new Error("コピーに失敗しました（ブラウザの許可を確認）"));
    }
  });

  onClick("btn-check-couple", async () => {
    try {
      if (state.get().mode !== "inviter") return;
      const me = await getMyCouple(state.get().accessToken);
      setStatus({ flow: "poll_couple", couple: me });
      if (me.status === "active" && me.members.length >= 2) {
        showScreen("done");
        return;
      }
      setStatus({
        flow: "waiting_partner",
        coupleStatus: me.status,
        members: me.members.length,
        message: "まだ相手の参加が反映されていません。相手の端末でコード入力が終わるまで待ってから、もう一度「確認」してください。",
      });
    } catch (error) {
      showError(error);
    }
  });

  onClick("btn-accept-invite", async () => {
    try {
      if (state.get().mode !== "invitee") return;
      const code = valueOf("accept-code").toUpperCase();
      if (!code) {
        showError(new Error("招待コードを入力してください（例: CP-AB12）"));
        return;
      }
      const accepted = await acceptInvite(state.get().accessToken, code);
      setStatus({ flow: "accepted", couple: accepted });
      if (accepted.status === "active") {
        showScreen("done");
      }
    } catch (error) {
      showError(error);
    }
  });
}
