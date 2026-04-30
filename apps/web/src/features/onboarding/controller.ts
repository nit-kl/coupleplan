import { HttpError } from "../../shared/api/httpClient";
import {
  acceptInvite,
  createCouple,
  deleteMe,
  getMe,
  getMyCouple,
  issueInvite,
  logoutSession,
  refreshSession,
  requestOtp,
  updateProfile,
  verifyOtp,
} from "./api";
import { createOnboardingState } from "./state";
import {
  applyPairMode,
  onClick,
  setHomeSummary,
  setInputValue,
  setInviteCode,
  setPairHeadlines,
  setProfileModeHint,
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

function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 404;
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 401;
}

function goToProfile(state: ReturnType<typeof createOnboardingState>, mode: OnboardingMode): void {
  state.setMode(mode);
  setProfileModeHint(mode);
  showScreen("profile");
}

async function sendOtpForCurrentEmail(
  state: ReturnType<typeof createOnboardingState>,
  email: string,
): Promise<void> {
  await requestOtp(email);
  state.setOtpRequestedEmail(email);
  alert("認証コードを送信しました。メールの6桁コードを入力して進んでください。");
}

async function verifySessionWithManualOtp(
  state: ReturnType<typeof createOnboardingState>,
  email: string,
): Promise<void> {
  const otpCode = valueOf("otp-code");
  if (!otpCode) throw new Error("認証コード（6桁）を入力してください。");
  if (state.get().otpRequestedEmail !== email) {
    throw new Error("先に「認証コードを送信」を押してください（メール変更後は再送が必要です）。");
  }
  const verified = await verifyOtp(email, otpCode);
  state.setAccessToken(verified.accessToken);
  state.setUser(verified.user);
}

async function loadCoupleOptional(accessToken: string): Promise<Awaited<ReturnType<typeof getMyCouple>> | undefined> {
  try {
    return await getMyCouple(accessToken);
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }
}

async function refreshHome(state: ReturnType<typeof createOnboardingState>): Promise<void> {
  const accessToken = state.get().accessToken;
  if (!accessToken) {
    throw new Error("ログイン情報がありません。もう一度ログインしてください。");
  }
  const [user, couple] = await Promise.all([getMe(accessToken), loadCoupleOptional(accessToken)]);
  state.setUser(user);
  state.setCouple(couple);
  setHomeSummary(user, couple);
  showScreen("home");
}

/** 招待側: カップル作成 + 招待コード発行 */
async function initializeSessionInviter(state: ReturnType<typeof createOnboardingState>): Promise<void> {
  const email = valueOf("email");
  const displayName = valueOf("display-name");
  if (!email || !displayName) {
    throw new Error("メールアドレスと表示名を入力してください");
  }
  await verifySessionWithManualOtp(state, email);

  const user = await updateProfile(state.get().accessToken, displayName);
  state.setUser(user);

  try {
    await createCouple(state.get().accessToken);
  } catch (error) {
    if (!isAlreadyInCoupleError(error)) throw error;
  }

  const invite = await issueInvite(state.get().accessToken);
  state.setInviteCode(invite.code);
  setInviteCode(state.get().inviteCode);
  state.setCouple(await getMyCouple(state.get().accessToken));
}

/** 被招待側: プロフィールまで（カップル未作成） */
async function initializeSessionInvitee(state: ReturnType<typeof createOnboardingState>): Promise<void> {
  const email = valueOf("email");
  const displayName = valueOf("display-name");
  if (!email || !displayName) {
    throw new Error("メールアドレスと表示名を入力してください");
  }
  await verifySessionWithManualOtp(state, email);

  const user = await updateProfile(state.get().accessToken, displayName);
  state.setUser(user);
}

export function startOnboardingController(): void {
  const state = createOnboardingState();

  onClick("go-inviter", () => goToProfile(state, "inviter"));
  onClick("go-invitee", () => goToProfile(state, "invitee"));
  onClick("go-login", () => showScreen("login"));
  onClick("back-start", () => showScreen("start"));
  onClick("back-login-start", () => showScreen("start"));
  onClick("back-profile", () => showScreen("profile"));
  onClick("go-home", async () => {
    try {
      await refreshHome(state);
    } catch (error) {
      showError(error);
    }
  });
  onClick("home-back-start", () => showScreen("start"));

  void (async () => {
    try {
      const refreshed = await refreshSession();
      state.setAccessToken(refreshed.accessToken);
      state.setUser(refreshed.user);
      await refreshHome(state);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        state.resetSession();
        return;
      }
      showError(error);
    }
  })();

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

  onClick("btn-send-otp", async () => {
    try {
      const email = valueOf("email");
      if (!email) {
        throw new Error("メールアドレスを入力してください");
      }
      await sendOtpForCurrentEmail(state, email);
    } catch (error) {
      showError(error);
    }
  });

  onClick("btn-login-send-otp", async () => {
    try {
      const email = valueOf("login-email");
      if (!email) {
        throw new Error("メールアドレスを入力してください");
      }
      await requestOtp(email);
      state.setOtpRequestedEmail(email);
      alert("認証コードを送信しました。メールの6桁コードを入力してください。");
    } catch (error) {
      showError(error);
    }
  });

  onClick("btn-login-verify", async () => {
    try {
      const email = valueOf("login-email");
      const otpCode = valueOf("login-otp-code");
      if (!email || !otpCode) {
        throw new Error("メールアドレスと認証コードを入力してください");
      }
      if (state.get().otpRequestedEmail !== email) {
        throw new Error("先に「認証コードを送信」を押してください（メール変更後は再送が必要です）。");
      }
      const verified = await verifyOtp(email, otpCode);
      state.setAccessToken(verified.accessToken);
      state.setUser(verified.user);
      await refreshHome(state);
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
      alert("招待コードを再発行しました。");
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
      alert("招待コードをコピーしました。");
    } catch {
      showError(new Error("コピーに失敗しました（ブラウザの許可を確認）"));
    }
  });

  onClick("btn-check-couple", async () => {
    try {
      if (state.get().mode !== "inviter") return;
      const me = await getMyCouple(state.get().accessToken);
      if (me.status === "active" && me.members.length >= 2) {
        showScreen("done");
        return;
      }
      alert("まだ相手の参加が反映されていません。時間を置いてからもう一度確認してください。");
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
      if (accepted.status === "active") {
        state.setCouple(accepted);
        showScreen("done");
      }
    } catch (error) {
      showError(error);
    }
  });

  onClick("btn-withdraw", async () => {
    try {
      const accessToken = state.get().accessToken;
      if (!accessToken) {
        throw new Error("退会にはログインが必要です。");
      }
      const ok = confirm(
        "退会すると、あなたと相手のカップル連携データ・招待コード・セッションを含む全データを削除します。元に戻せません。退会しますか？",
      );
      if (!ok) return;
      await deleteMe(accessToken);
      await logoutSession().catch(() => undefined);
      state.resetSession();
      setInviteCode("");
      setInputValue("otp-code", "");
      setInputValue("login-otp-code", "");
      setHomeSummary(undefined, undefined);
      alert("退会が完了しました。全データを削除しました。");
      showScreen("start");
    } catch (error) {
      showError(error);
    }
  });
}
