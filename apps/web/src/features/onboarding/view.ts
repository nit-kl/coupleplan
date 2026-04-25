import { screenIds, type OnboardingMode, type ScreenId } from "./types";

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

export function setInviteCode(code: string): void {
  const element = document.getElementById("invite-code") as HTMLDivElement | null;
  if (!element) return;
  element.textContent = code || "CP----";
}

export function setStatus(data: unknown): void {
  const element = document.getElementById("status");
  if (!element) return;
  element.textContent = `ステータス:\n${JSON.stringify(data, null, 2)}`;
}

export function onClick(id: string, handler: () => void | Promise<void>): void {
  document.getElementById(id)?.addEventListener("click", () => {
    void handler();
  });
}

export function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  alert(message);
  setStatus({ error: message });
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
