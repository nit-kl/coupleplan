import type { PlanCard, RouletteResultView, RouletteScreen, RouletteSessionView } from "./types";

const SCREEN_IDS: RouletteScreen[] = ["swipe", "wait", "match", "spin", "result"];

const NON_ROULETTE_SCREEN_IDS = ["start", "profile", "login", "pair", "done", "home"];

export function showRouletteScreen(screen: RouletteScreen): void {
  document.getElementById("screen-ninja")?.classList.remove("active");
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

  const spinWheel = document.querySelector("#screen-roulette-spin .rv-spin-wheel");
  if (spinWheel instanceof HTMLElement) {
    if (screen === "spin") {
      spinWheel.classList.remove("rv-spin-animate");
      void spinWheel.offsetWidth;
      spinWheel.classList.add("rv-spin-animate");
    } else {
      spinWheel.classList.remove("rv-spin-animate");
    }
  }
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
      <div class="rv-deck">
        <div class="rv-deck-card rv-deck-card--done">
          <span class="rv-deck-emoji" aria-hidden="true">✅</span>
          <h2 class="rv-deck-title">お疲れさま！</h2>
          <p class="rv-deck-desc">すべてのプランを見終わりました。投票を送信してね。</p>
        </div>
      </div>
    `;
    return;
  }
  stage.innerHTML = `
    <div class="rv-deck">
      <div class="rv-deck-card" data-plan-id="${escapeHtml(plan.id)}">
        <span class="rv-deck-emoji" aria-hidden="true">${escapeHtml(plan.emoji)}</span>
        <h2 class="rv-deck-title">${escapeHtml(plan.title)}</h2>
        <p class="rv-deck-desc">${escapeHtml(plan.description)}</p>
      </div>
      <div class="rv-vote-stack">
        <button type="button" class="rv-btn-pass" id="btn-vote-pass">今回はパス</button>
        <button type="button" class="rv-btn-like" id="btn-vote-like">いいね！ 💗</button>
      </div>
    </div>
  `;
}

export function renderSubmitStage(disabled: boolean): void {
  const stage = document.getElementById("roulette-card-stage");
  if (!stage) return;
  stage.innerHTML = `
    <div class="rv-deck">
      <div class="rv-deck-card rv-deck-card--submit">
        <span class="rv-deck-emoji" aria-hidden="true">📨</span>
        <h2 class="rv-deck-title">この内容で送信する？</h2>
        <p class="rv-deck-desc">送信したあとは相手の投票を待ちます。送信前なら、ひとつ前のカードに戻れます。</p>
      </div>
      <div class="rv-vote-stack">
        <button type="button" class="rv-btn-pass" id="btn-vote-back">ひとつ前に戻る</button>
        <button type="button" class="rv-btn-like" id="btn-submit-votes" ${disabled ? "disabled" : ""}>この内容で送信する</button>
      </div>
    </div>
  `;
}

export function setSwipeProgress(current: number, total: number): void {
  const label = document.getElementById("roulette-progress");
  const bar = document.getElementById("roulette-progress-bar");
  const track = document.getElementById("roulette-progress-track");
  const safeCurrent = total === 0 ? 0 : Math.min(current, total);
  if (label) {
    label.textContent = total === 0 ? "プランを読み込み中…" : `${safeCurrent} / ${total}`;
  }
  if (bar) {
    const pct = total === 0 ? 0 : (safeCurrent / total) * 100;
    bar.style.width = `${pct}%`;
  }
  if (track) {
    track.setAttribute("aria-valuemax", String(Math.max(0, total)));
    track.setAttribute("aria-valuenow", String(safeCurrent));
  }
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
      el.textContent = "あなたの投票は完了済みです。相手の選択が終わるまで、気長に待てます。";
      return;
    }
    if (!session.partners.me.completed) {
      el.textContent = "投票を最後まで進めてから送信してください。";
      return;
    }
    el.textContent = "ふたりの「いいね」が3件以上かぶりませんでした。やり直して、もう一度すり合わせてみましょう。";
    return;
  }
  el.textContent = "セッションを確認しています…";
}

export function setMatchList(plans: PlanCard[]): void {
  const list = document.getElementById("roulette-match-list");
  if (!list) return;
  list.innerHTML = plans
    .map(
      (p) => `<li class="rv-match-item" role="listitem">
        <span class="rv-match-emoji" aria-hidden="true">${escapeHtml(p.emoji)}</span>
        <strong class="rv-match-title">${escapeHtml(p.title)}</strong>
        <span class="rv-match-desc">${escapeHtml(p.description)}</span>
      </li>`,
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
