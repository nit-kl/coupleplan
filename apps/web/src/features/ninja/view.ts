import type { NinjaMissionCard, NinjaWeekView } from "./types";

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
      <span class="nj-emoji" aria-hidden="true">${m.emoji}</span>
      <strong>${m.title}</strong>
      <div class="nj-meta">${m.description} · <strong>+${m.point}pt</strong></div>
    </button>`,
    )
    .join("");
}

export function renderNinjaWeek(week: NinjaWeekView): void {
  const summary = document.getElementById("ninja-week-summary");
  if (summary) {
    summary.textContent = `今週（月 ${week.weekStart} 〜 日 ${week.weekEnd}）`;
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
        <p class="hero-lead" style="margin:0 0 0.5rem; font-size:0.95rem;">週次の合計が公開されました</p>
        <p style="margin:0; font-weight:800; font-size:1.1rem;">あなた <strong>${week.myPoints}pt</strong>　／　相手 <strong>${week.partnerPoints}pt</strong></p>
        <p class="hero-lead" style="margin:0.6rem 0 0; font-size:0.92rem;">${lead}</p>
      `;
    } else {
      panel.hidden = false;
      panel.innerHTML = `
        <p class="hero-lead" style="margin:0; font-size:0.95rem;">あなたの今週の合計: <strong>${week.myPoints}pt</strong></p>
        <p class="hero-lead" style="margin:0.45rem 0 0; font-size:0.88rem; color:var(--ink-soft);">相手の合計は週次ジョブ公開後に表示されます。</p>
      `;
    }
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
