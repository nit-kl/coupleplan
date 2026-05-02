import type { PlanCard, RouletteResultView, RouletteScreen, RouletteSessionView } from "./types";

const SCREEN_IDS: RouletteScreen[] = ["swipe", "wait", "match", "spin", "result"];

const NON_ROULETTE_SCREEN_IDS = ["start", "profile", "login", "pair", "done", "home"];

export function showRouletteScreen(screen: RouletteScreen): void {
  for (const id of NON_ROULETTE_SCREEN_IDS) {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.remove("active");
  }
  for (const id of SCREEN_IDS) {
    const el = document.getElementById(`screen-roulette-${id}`);
    if (!el) continue;
    el.classList.toggle("active", id === screen);
  }
  window.scrollTo(0, 0);
}

export function hideAllRouletteScreens(): void {
  for (const id of SCREEN_IDS) {
    const el = document.getElementById(`screen-roulette-${id}`);
    if (!el) continue;
    el.classList.remove("active");
  }
}

export function renderPlanCard(plan: PlanCard | undefined): void {
  const stage = document.getElementById("roulette-card-stage");
  if (!stage) return;
  if (!plan) {
    stage.innerHTML = `
      <div class="plan-card">
        <span class="emoji" aria-hidden="true">✅</span>
        <h2>すべて選び終えました</h2>
        <p>送信ボタンで投票を確定してください。</p>
      </div>
    `;
    return;
  }
  stage.innerHTML = `
    <div class="plan-card" data-plan-id="${escapeHtml(plan.id)}">
      <span class="emoji" aria-hidden="true">${escapeHtml(plan.emoji)}</span>
      <h2>${escapeHtml(plan.title)}</h2>
      <p>${escapeHtml(plan.description)}</p>
    </div>
    <div class="vote-buttons">
      <button type="button" class="btn-pass" id="btn-vote-pass">パス</button>
      <button type="button" class="btn-like" id="btn-vote-like">いいね 💗</button>
    </div>
  `;
}

export function renderSubmitStage(disabled: boolean): void {
  const stage = document.getElementById("roulette-card-stage");
  if (!stage) return;
  stage.innerHTML = `
    <div class="plan-card">
      <span class="emoji" aria-hidden="true">📨</span>
      <h2>あなたの投票を送信</h2>
      <p>送信したあとは相手の投票を待ちます。送信前ならカードを戻すこともできます。</p>
    </div>
    <div class="vote-buttons">
      <button type="button" class="btn-pass" id="btn-vote-back">前のカードに戻る</button>
      <button type="button" class="btn-like" id="btn-submit-votes" ${disabled ? "disabled" : ""}>投票を送信</button>
    </div>
  `;
}

export function setSwipeProgress(current: number, total: number): void {
  const el = document.getElementById("roulette-progress");
  if (!el) return;
  el.textContent = total === 0 ? "プランを読み込み中..." : `${Math.min(current, total)} / ${total}`;
}

export function setSwipeStatus(text: string): void {
  const el = document.getElementById("roulette-swipe-status");
  if (el) el.textContent = text;
}

export function setRestartSwipeVisible(visible: boolean): void {
  const el = document.getElementById("btn-restart-from-swipe") as HTMLButtonElement | null;
  if (el) el.hidden = !visible;
}

export function setWaitDetail(session: RouletteSessionView): void {
  const el = document.getElementById("roulette-wait-detail");
  if (!el) return;
  if (session.status === "collecting") {
    if (session.partners.me.completed && !session.partners.partner.completed) {
      el.textContent = "あなたの投票は完了済みです。相手の選択を待っています。";
      return;
    }
    if (!session.partners.me.completed) {
      el.textContent = "投票を最後まで進めてから送信してください。";
      return;
    }
    el.textContent = "両者の投票は揃いましたが、3件以上の交差がありませんでした。やり直してみましょう。";
    return;
  }
  el.textContent = "セッションを確認しています…";
}

export function setMatchList(plans: PlanCard[]): void {
  const list = document.getElementById("roulette-match-list");
  if (!list) return;
  list.innerHTML = plans
    .map(
      (p) => `<li><strong>${escapeHtml(p.emoji)} ${escapeHtml(p.title)}</strong><br /><span style="color:var(--ink-soft)">${escapeHtml(p.description)}</span></li>`,
    )
    .join("");
}

export function renderResult(result: RouletteResultView | undefined): void {
  const emoji = document.getElementById("result-emoji");
  const title = document.getElementById("result-title");
  const desc = document.getElementById("result-description");
  if (!result) {
    if (emoji) emoji.textContent = "🎉";
    if (title) title.textContent = "結果が見つかりません";
    if (desc) desc.textContent = "セッションを確認してください。";
    return;
  }
  if (emoji) emoji.textContent = result.selectedPlan.emoji;
  if (title) title.textContent = result.selectedPlan.title;
  if (desc) desc.textContent = result.selectedPlan.description;
}

export function showRouletteError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  alert(message);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
