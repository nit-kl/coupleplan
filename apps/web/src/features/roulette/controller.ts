import { getAccessToken } from "../../shared/session/sessionStore";
import {
  getPlans,
  getSession,
  restartSession,
  spinSession,
  submitVotes,
} from "./api";
import { createRouletteState } from "./state";
import type { PlanCard, RouletteSessionView } from "./types";
import {
  hideAllRouletteScreens,
  renderPlanCard,
  renderResult,
  renderSubmitStage,
  setMatchList,
  setRestartSwipeVisible,
  setSwipeProgress,
  setSwipeStatus,
  setWaitDetail,
  showRouletteError,
  showRouletteScreen,
} from "./view";

const HOME_SCREEN_ID = "screen-home";

function showHomeScreen(): void {
  hideAllRouletteScreens();
  document.getElementById("screen-ninja")?.classList.remove("active");
  for (const id of ["start", "profile", "login", "pair", "done"]) {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.remove("active");
  }
  const home = document.getElementById(HOME_SCREEN_ID);
  if (home) home.classList.add("active");
  window.scrollTo(0, 0);
}

function bindClick(id: string, handler: () => void | Promise<void>): void {
  document.getElementById(id)?.addEventListener("click", () => {
    void handler();
  });
}

function ensureToken(): string {
  const token = getAccessToken();
  if (!token) {
    throw new Error("ログインが必要です。ホームで再ログインしてください。");
  }
  return token;
}

export function startRouletteController(): void {
  const state = createRouletteState();

  async function loadAndRender(): Promise<void> {
    const token = ensureToken();
    const { plans } = await getPlans(token);
    state.setPlans(plans);
    const session = await getSession(token);
    state.setSession(session);
    routeByStatus(session);
  }

  function routeByStatus(session: RouletteSessionView): void {
    const { plans } = state.get();
    if (session.status === "decided") {
      renderResult(session.result);
      showRouletteScreen("result");
      return;
    }
    if (session.status === "ready") {
      const matched = mapMatchedPlans(plans, session.matchedPlanIds);
      setMatchList(matched);
      showRouletteScreen("match");
      return;
    }
    // collecting
    if (session.partners.me.completed) {
      setWaitDetail(session);
      showRouletteScreen("wait");
      return;
    }
    rebuildPendingFromMyVotes(session);
    renderCurrentSwipeFrame();
    showRouletteScreen("swipe");
  }

  function mapMatchedPlans(plans: PlanCard[], matchedIds: string[]): PlanCard[] {
    const lookup = new Map(plans.map((p) => [p.id, p]));
    return matchedIds
      .map((id) => lookup.get(id))
      .filter((p): p is PlanCard => Boolean(p));
  }

  function rebuildPendingFromMyVotes(session: RouletteSessionView): void {
    const s = state.get();
    s.pendingVotes.clear();
    for (const v of session.myVotes) {
      s.pendingVotes.set(v.planId, v.vote);
    }
    const firstUnvoted = s.plans.findIndex((p) => !s.pendingVotes.has(p.id));
    s.cursor = firstUnvoted === -1 ? s.plans.length : firstUnvoted;
  }

  function renderCurrentSwipeFrame(): void {
    const s = state.get();
    const plan = s.plans[s.cursor];
    setSwipeStatus("相手の画面には出ません。好きなペースで、直感のまま選んでね。");
    setSwipeProgress(s.cursor, s.plans.length);
    setRestartSwipeVisible(s.pendingVotes.size > 0 || s.cursor > 0);
    if (plan) {
      renderPlanCard(plan);
      bindClick("btn-vote-pass", () => recordVote("pass"));
      bindClick("btn-vote-like", () => recordVote("like"));
      return;
    }
    renderSubmitStage(s.pendingVotes.size === 0);
    bindClick("btn-vote-back", () => stepBack());
    bindClick("btn-submit-votes", () => submitAllVotes());
  }

  function recordVote(vote: "like" | "pass"): void {
    const s = state.get();
    const plan = s.plans[s.cursor];
    if (!plan) return;
    state.setVote(plan.id, vote);
    state.setCursor(s.cursor + 1);
    renderCurrentSwipeFrame();
  }

  function stepBack(): void {
    const s = state.get();
    if (s.cursor === 0) return;
    state.setCursor(s.cursor - 1);
    renderCurrentSwipeFrame();
  }

  async function submitAllVotes(): Promise<void> {
    try {
      const token = ensureToken();
      const votes = state.pendingVotesArray();
      if (votes.length === 0) {
        throw new Error("先にプランへ「いいね/パス」を入れてください。");
      }
      setSwipeStatus("送信中… そのまま少し待ってね。");
      const session = await submitVotes(token, votes);
      state.setSession(session);
      await loadAndRender();
    } catch (error) {
      showRouletteError(error);
    }
  }

  async function spin(): Promise<void> {
    try {
      const token = ensureToken();
      showRouletteScreen("spin");
      // 演出のため少し待ってから抽選確定（UI のみ）
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const session = await spinSession(token);
      state.setSession(session);
      renderResult(session.result);
      showRouletteScreen("result");
    } catch (error) {
      showRouletteError(error);
      // エラー時は match 画面に戻す
      try {
        await loadAndRender();
      } catch {
        showHomeScreen();
      }
    }
  }

  async function restart(): Promise<void> {
    try {
      const token = ensureToken();
      const session = await restartSession(token);
      state.setSession(session);
      rebuildPendingFromMyVotes(session);
      routeByStatus(session);
    } catch (error) {
      showRouletteError(error);
    }
  }

  async function refreshOnly(): Promise<void> {
    try {
      await loadAndRender();
    } catch (error) {
      showRouletteError(error);
    }
  }

  bindClick("go-roulette", async () => {
    try {
      await loadAndRender();
    } catch (error) {
      showRouletteError(error);
    }
  });

  bindClick("roulette-back-home", showHomeScreen);
  bindClick("wait-back-home", showHomeScreen);
  bindClick("match-back-home", showHomeScreen);
  bindClick("btn-result-home", showHomeScreen);

  bindClick("btn-refresh-wait", refreshOnly);

  bindClick("btn-restart-from-swipe", restart);
  bindClick("btn-restart-from-wait", restart);
  bindClick("btn-restart-from-match", restart);
  bindClick("btn-result-restart", restart);

  bindClick("btn-spin", spin);
}
