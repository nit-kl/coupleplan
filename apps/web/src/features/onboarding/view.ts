import { screenIds, type CoupleMeResponse, type OnboardingMode, type ScreenId, type UserProfile } from "./types";

export function showScreen(screen: ScreenId): void {
  screenIds.forEach((id) => {
    const element = document.getElementById(`screen-${id}`);
    if (!element) return;
    element.classList.toggle("active", id === screen);
  });
  window.scrollTo(0, 0);
}

export function valueOf(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).value.trim();
}

export function setInputValue(id: string, value: string): void {
  const element = document.getElementById(id) as HTMLInputElement | null;
  if (!element) return;
  element.value = value;
}

export function setInviteCode(code: string): void {
  const element = document.getElementById("invite-code") as HTMLDivElement | null;
  if (!element) return;
  element.textContent = code || "CP----";
}

export function onClick(id: string, handler: () => void | Promise<void>): void {
  document.getElementById(id)?.addEventListener("click", () => {
    void handler();
  });
}

export function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  alert(message);
}

export function applyPairMode(mode: OnboardingMode): void {
  const inviter = document.getElementById("block-inviter");
  const invitee = document.getElementById("block-invitee");
  if (inviter) inviter.hidden = mode !== "inviter";
  if (invitee) invitee.hidden = mode !== "invitee";
}

export function setProfileModeHint(mode: OnboardingMode): void {
  const el = document.getElementById("profile-mode-hint");
  if (!el) return;
  el.textContent =
    mode === "inviter"
      ? "先に登録し、相手に招待コードを送ります（LINE・メール等で共有）。"
      : "あとから参加します。相手が送った CP- 形式のコードを手元に用意してください。";
}

export function setPairHeadlines(mode: OnboardingMode): void {
  const title = document.getElementById("pair-hero-title");
  const lead = document.getElementById("pair-hero-lead");
  if (title) {
    title.textContent = mode === "inviter" ? "相手にコードを送る" : "招待コードを入力";
  }
  if (lead) {
    lead.textContent =
      mode === "inviter"
        ? "共有が済んだら、相手の端末で参加してもらいましょう。有効化は下の「確認」で行います。"
        : "相手が先に登録し、送ってくれたコードを入力してカップルに参加します。";
  }
}

function setCoupleStatusStyle(el: HTMLElement, kind: "ok" | "warn" | "pending"): void {
  el.classList.remove("portal-couple-ok", "portal-couple-warn", "portal-couple-pending");
  el.classList.add(kind === "ok" ? "portal-couple-ok" : kind === "pending" ? "portal-couple-pending" : "portal-couple-warn");
}

export function setHomeSummary(user: UserProfile | undefined, couple: CoupleMeResponse | undefined): void {
  const nameEl = document.getElementById("home-user-name");
  const emailEl = document.getElementById("home-user-email");
  const coupleStatus = document.getElementById("home-couple-status");
  const rouletteButton = document.getElementById("go-roulette") as HTMLButtonElement | null;
  const ninjaButton = document.getElementById("go-ninja") as HTMLButtonElement | null;

  if (nameEl) {
    nameEl.textContent = user ? `${user.displayName} さん、ようこそ` : "ログイン情報を取得できませんでした";
  }
  if (emailEl) {
    if (user) {
      emailEl.textContent = user.email;
      emailEl.hidden = false;
    } else {
      emailEl.textContent = "";
      emailEl.hidden = true;
    }
  }

  if (coupleStatus) {
    if (!couple) {
      coupleStatus.textContent =
        "まだふたりのポータルが始まっていません。下の「はじめの画面」から登録・招待を続けてください。";
      setCoupleStatusStyle(coupleStatus, "warn");
      if (rouletteButton) rouletteButton.hidden = true;
      if (ninjaButton) ninjaButton.hidden = true;
      return;
    }
    if (couple.status === "active") {
      coupleStatus.textContent = `ふたりでポータル利用中（メンバー ${couple.members.length}人）`;
      setCoupleStatusStyle(coupleStatus, "ok");
    } else {
      coupleStatus.textContent = "相手の参加待ちです。招待コードを共有したまま、落ち着いて待てます。";
      setCoupleStatusStyle(coupleStatus, "pending");
    }
  }
  if (rouletteButton) {
    rouletteButton.hidden = !(couple && couple.status === "active");
  }
  if (ninjaButton) {
    ninjaButton.hidden = !(couple && couple.status === "active");
  }
}
