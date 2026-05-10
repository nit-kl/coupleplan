import { trackFunnel } from "../shared/analytics/funnel";

function hideLp(): void {
  document.getElementById("screen-lp")?.classList.remove("active");
}

function showLp(): void {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.remove("active");
  });
  document.getElementById("screen-lp")?.classList.add("active");
  window.scrollTo(0, 0);
}

/** アプリ側の画面を出すときに URL を `/app` にそろえる（LP を閉じる） */
export function ensureAppRoute(): void {
  const path = window.location.pathname;
  if (path === "/" || path === "") {
    window.history.replaceState({}, "", "/app");
  }
  hideLp();
}

export function pushAppRoute(path = "/app"): void {
  window.history.pushState({ cpRoute: "app" }, "", path);
  hideLp();
}

export function isAppPath(): boolean {
  const path = window.location.pathname;
  return path === "/app" || path.startsWith("/app/");
}

/** 初回ロード時: `/` は LP、`/app` はアプリ（オンボ入口を既定表示。計測: lp_view は LP のみ） */
export function initShellRouting(): void {
  const path = window.location.pathname;

  if (path === "/app" || path.startsWith("/app/")) {
    document.getElementById("screen-lp")?.classList.remove("active");
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    document.getElementById("screen-start")?.classList.add("active");
    return;
  }

  showLp();
  trackFunnel("lp_view");
}
