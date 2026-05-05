import { getAccessToken } from "../../shared/session/sessionStore";
import {
  getNinjaMissions,
  getNinjaWeek,
  postNinjaCustomMission,
  postNinjaLog,
  publishNinjaWeek,
  resetNinjaWeek,
} from "./api";
import type { NinjaMissionCard } from "./types";
import { flashNinjaCheer, renderNinjaMissions, renderNinjaWeek, showNinjaScreen } from "./view";

function ensureToken(): string {
  const token = getAccessToken();
  if (!token) {
    throw new Error("ログインが必要です。ホームで再ログインしてください。");
  }
  return token;
}

export function startNinjaController(): void {
  let missionsCache: NinjaMissionCard[] = [];

  async function loadAll(): Promise<void> {
    const token = ensureToken();
    const [{ missions }, week] = await Promise.all([getNinjaMissions(token), getNinjaWeek(token)]);
    missionsCache = missions;
    renderNinjaMissions(missions);
    renderNinjaWeek(week);
  }

  function bindClick(id: string, handler: () => void | Promise<void>): void {
    document.getElementById(id)?.addEventListener("click", () => {
      void handler();
    });
  }

  bindClick("go-ninja", async () => {
    try {
      showNinjaScreen();
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  });

  bindClick("ninja-back-home", () => {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    document.getElementById("screen-home")?.classList.add("active");
    window.scrollTo(0, 0);
  });

  bindClick("ninja-refresh", async () => {
    try {
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  });

  bindClick("ninja-custom-add", async () => {
    const titleInput = document.getElementById("ninja-custom-title") as HTMLInputElement | null;
    const pointSelect = document.getElementById("ninja-custom-point") as HTMLSelectElement | null;
    if (!titleInput || !pointSelect) return;
    const rawTitle = titleInput.value.trim();
    const pointNum = Number(pointSelect.value);
    if (!rawTitle) {
      alert("任務名を入力してください。");
      titleInput.focus();
      return;
    }
    if (pointNum !== 5 && pointNum !== 10) {
      alert("ポイントは 5pt か 10pt を選択してください。");
      pointSelect.focus();
      return;
    }
    try {
      const token = ensureToken();
      const addBtn = document.getElementById("ninja-custom-add") as HTMLButtonElement | null;
      if (addBtn) addBtn.disabled = true;
      const created = await postNinjaCustomMission(token, { title: rawTitle, point: pointNum as 5 | 10 });
      titleInput.value = "";
      await loadAll();
      flashNinjaCheer(`「${created.mission.title}」を追加しました（+${created.mission.point}pt）`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      const addBtn = document.getElementById("ninja-custom-add") as HTMLButtonElement | null;
      if (addBtn) addBtn.disabled = false;
    }
  });

  bindClick("ninja-publish-week", async () => {
    try {
      const token = ensureToken();
      const week = await publishNinjaWeek(token);
      renderNinjaWeek(week);
      if (missionsCache.length > 0) renderNinjaMissions(missionsCache);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  });

  bindClick("ninja-reset-week", async () => {
    try {
      const token = ensureToken();
      const week = await resetNinjaWeek(token);
      renderNinjaWeek(week);
      if (missionsCache.length > 0) renderNinjaMissions(missionsCache);
      flashNinjaCheer("公開をリセットしました。記録はそのまま残っています。");
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  });

  document.getElementById("ninja-mission-list")?.addEventListener("click", async (ev) => {
    const target = ev.target as HTMLElement;
    const btn = target.closest?.("[data-mission-id]") as HTMLButtonElement | null;
    if (!btn) return;
    const missionId = btn.dataset.missionId;
    if (!missionId) return;
    if (btn.disabled) return;
    try {
      btn.disabled = true;
      const token = ensureToken();
      const result = await postNinjaLog(token, missionId);
      const week = await getNinjaWeek(token);
      renderNinjaWeek(week);
      if (missionsCache.length > 0) renderNinjaMissions(missionsCache);
      flashNinjaCheer(`+${result.log.point}pt「${result.log.title}」を記録しました`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      btn.disabled = false;
    }
  });
}
