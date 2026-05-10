import { initShellRouting, pushAppRoute } from "./shell/router";
import { startNinjaController } from "./features/ninja/controller";
import { startOnboardingController } from "./features/onboarding/controller";
import { showScreen } from "./features/onboarding/view";
import { startRouletteController } from "./features/roulette/controller";
import { trackFunnel } from "./shared/analytics/funnel";

function injectPlausible(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain) return;
  if (document.querySelector(`script[data-domain="${domain}"][src*="plausible.io"]`)) return;
  const s = document.createElement("script");
  s.defer = true;
  s.dataset.domain = domain;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

injectPlausible();
initShellRouting();

if (
  window.location.pathname === "/app" ||
  window.location.pathname.startsWith("/app/")
) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("login") === "1") {
    showScreen("login");
  }
}

document.getElementById("lp-go-app")?.addEventListener("click", () => {
  pushAppRoute("/app");
  trackFunnel("lp_cta_app");
  showScreen("start");
});

startOnboardingController();
startRouletteController();
startNinjaController();
