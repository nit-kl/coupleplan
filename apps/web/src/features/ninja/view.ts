import type { NinjaMissionCard, NinjaWeekView } from "./types";

function getMissionTone(point: number): string {
  if (point <= 3) return "サクッと";
  if (point <= 5) return "しっかり";
  return "とっておき";
}

function getPointMood(points: number): string {
  if (points >= 24) return "最強の気づかいニンジャ";
  if (points >= 14) return "ナイス連携ニンジャ";
  if (points >= 6) return "じわっと貢献ニンジャ";
  return "これから本気ニンジャ";
}

function countActionDays(isoTimestamps: string[]): number {
  return new Set(isoTimestamps.map((v) => v.slice(0, 10))).size;
}

export function showNinjaScreen(): void {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.remove("active");
  });
  document.getElementById("screen-ninja")?.classList.add("active");
  window.scrollTo(0, 0);
}

export function renderNinjaMissions(missions: NinjaMissionCard[]): void {
  const list = document.getElementById("ninja-mission-list");
  if (!list) return;
  list.innerHTML = missions
    .map(
      (m) => `
    <button type="button" class="ninja-mission-btn" data-mission-id="${m.id}">
      <div class="nj-head">
        <span class="nj-emoji" aria-hidden="true">${m.emoji}</span>
        <strong>${m.title}</strong>
        <span class="nj-tag">${getMissionTone(m.point)}</span>
      </div>
      <div class="nj-meta">${m.description} · <strong>+${m.point}pt</strong></div>
    </button>`,
    )
    .join("");
}

export function renderNinjaWeek(week: NinjaWeekView): void {
  const actionDays = countActionDays(week.myLogs.map((l) => l.createdAt));
  const pointMood = getPointMood(week.myPoints);

  const summary = document.getElementById("ninja-week-summary");
  if (summary) {
    summary.textContent = `今週（月 ${week.weekStart} 〜 日 ${week.weekEnd}）・${actionDays}日アクション`;
  }

  const panel = document.getElementById("ninja-score-panel");
  if (panel) {
    const published = week.publishedAt !== null;
    if (published && week.partnerPoints !== null) {
      const diff = week.myPoints - week.partnerPoints;
      const lead =
        diff > 0
          ? "今週はあなたがリード中！"
          : diff < 0
            ? "今週は相手がリード中！"
            : "今週は同点！";
      panel.hidden = false;
      panel.innerHTML = `
        <p class="ninja-panel-kicker">ふたりの今週スコアを公開しました</p>
        <p class="ninja-panel-score">あなた <strong>${week.myPoints}pt</strong>　／　相手 <strong>${week.partnerPoints}pt</strong></p>
        <p class="ninja-panel-note">${lead}</p>
      `;
    } else {
      panel.hidden = false;
      panel.innerHTML = `
        <p class="ninja-panel-kicker">あなたの今週スコア</p>
        <p class="ninja-panel-score"><strong>${week.myPoints}pt</strong> <span class="ninja-mood-chip">${pointMood}</span></p>
        <p class="ninja-panel-note">相手の合計は「公開する」まで見えません。準備ができたらふたりでオープン。</p>
      `;
    }
  }

  const pubBtn = document.getElementById("ninja-publish-week") as HTMLButtonElement | null;
  if (pubBtn) {
    pubBtn.hidden = week.publishedAt !== null;
  }
  const resetBtn = document.getElementById("ninja-reset-week") as HTMLButtonElement | null;
  if (resetBtn) {
    resetBtn.hidden = week.publishedAt === null;
  }

  const publishHint = document.getElementById("ninja-publish-hint");
  if (publishHint) {
    publishHint.textContent =
      week.publishedAt === null
        ? "公開すると、ふたりの合計だけ表示されます（内訳はずっと非公開）"
        : "今週は公開済み。必要なら「公開をリセット」で非公開に戻せます（記録は消えません）。";
  }

  const logEl = document.getElementById("ninja-my-log");
  if (logEl) {
    if (week.myLogs.length === 0) {
      logEl.innerHTML =
        '<li style="list-style:none; color:var(--ink-soft);">まだ申告がありません。上の任務から記録しましょう。</li>';
    } else {
      logEl.innerHTML = week.myLogs
        .map(
          (l) =>
            `<li><strong>+${l.point}pt</strong> ${l.title}<br /><span style="font-size:0.85rem; color:var(--ink-soft);">${l.createdAt.slice(0, 16).replace("T", " ")}</span></li>`,
        )
        .join("");
    }
  }
}

export function flashNinjaCheer(message: string): void {
  const cheer = document.getElementById("ninja-cheer");
  if (!cheer) return;
  cheer.textContent = message;
  cheer.hidden = false;
  window.setTimeout(() => {
    cheer.hidden = true;
  }, 1600);
}
