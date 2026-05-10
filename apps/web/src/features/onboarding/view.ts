import { ensureAppRoute } from "../../shell/router";
import { screenIds, type CoupleMeResponse, type OnboardingMode, type ScreenId, type UserProfile } from "./types";
import { trackCoupleActiveOnce } from "../../shared/analytics/funnel";

export function showScreen(screen: ScreenId): void {
  ensureAppRoute();
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

export function showCoupleGate(kind: "roulette" | "ninja"): void {
  const title = document.getElementById("couple-gate-title");
  const lead = document.getElementById("couple-gate-lead");
  const visual = document.getElementById("couple-gate-visual");
  if (visual) {
    visual.textContent = kind === "roulette" ? "🎲" : "🥷";
  }
  if (kind === "roulette") {
    if (title) title.textContent = "デートルーレットは「ふたり」から";
    if (lead) {
      lead.textContent =
        "スワイプや抽選は、パートナーとカップル連携したあとに楽しめます。まずは招待コードでつなぎましょう。";
    }
  } else {
    if (title) title.textContent = "サイレント・ニンジャは「ふたり」から";
    if (lead) {
      lead.textContent =
        "任務の申告や週の集計は、パートナーと連携したカップル向けです。連携後にまた開いてください。";
    }
  }
  showScreen("couple-gate");
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
      ? "先に登録し、相手に招待コードを送ります（LINE・メール等で共有）。ふたりがつながるまで、デートルーレット／ニンジャはお預けです。"
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
  const pairCta = document.getElementById("home-open-pair") as HTMLButtonElement | null;

  const fullyPaired =
    couple !== undefined && couple.status === "active" && couple.members.length >= 2;

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
        "まだカップルと連携していません。下のボタンから招待コードの発行や入力ができます。";
      setCoupleStatusStyle(coupleStatus, "warn");
    } else if (fullyPaired) {
      coupleStatus.textContent = `ふたりでポータル利用中（メンバー ${couple.members.length}人）`;
      setCoupleStatusStyle(coupleStatus, "ok");
      trackCoupleActiveOnce();
    } else if (couple.status === "active") {
      coupleStatus.textContent = "カップル情報を確認しています…";
      setCoupleStatusStyle(coupleStatus, "pending");
    } else {
      coupleStatus.textContent =
        "相手の参加待ちです。招待コードを共有したまま待つか、下のボタンで画面を開き直せます。";
      setCoupleStatusStyle(coupleStatus, "pending");
    }
  }

  if (rouletteButton) {
    rouletteButton.hidden = false;
  }
  if (ninjaButton) {
    ninjaButton.hidden = false;
  }
  if (pairCta) {
    pairCta.hidden = fullyPaired;
  }
}
