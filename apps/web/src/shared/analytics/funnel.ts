/**
 * Phase G-2: 匿名ファネルイベント（クライアント）。
 * ダッシュボード連携: VITE_PLAUSIBLE_DOMAIN 設定時は Plausible のカスタムイベントとして送信。
 * 未設定時は CustomEvent `cp-funnel` と sessionStorage に蓄積（開発・検証用）。
 */

export type FunnelEvent =
  | "lp_view"
  | "lp_cta_app"
  | "otp_send_click"
  | "otp_request_ok"
  | "otp_verify_success"
  | "couple_active";

const SESSION_KEY = "cp_funnel_sid";
const BUFFER_KEY = "cp_funnel_buf";
const COUPLE_ACTIVE_KEY = "cp_funnel_couple_active_sent";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

function appendBuffer(line: object): void {
  try {
    const raw = sessionStorage.getItem(BUFFER_KEY);
    const arr: object[] = raw ? (JSON.parse(raw) as object[]) : [];
    arr.push(line);
    sessionStorage.setItem(BUFFER_KEY, JSON.stringify(arr.slice(-40)));
  } catch {
    /* ignore */
  }
}

type PlausibleFn = (event: string, opts?: { props?: Record<string, string | number | boolean> }) => void;

function plausibleSend(event: FunnelEvent, props: Record<string, string>): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain) return;
  const plausible = (window as unknown as { plausible?: PlausibleFn }).plausible;
  plausible?.(event, { props });
}

export function trackFunnel(event: FunnelEvent, props?: Record<string, string>): void {
  const sid = getSessionId();
  const payload = {
    event,
    ts: Date.now(),
    sessionId: sid,
    ...props,
  };
  window.dispatchEvent(new CustomEvent("cp-funnel", { detail: payload }));
  appendBuffer(payload);
  plausibleSend(event, props ?? {});
}

/** ホームで active カップルを初めて検知したときだけ */
export function trackCoupleActiveOnce(): void {
  try {
    if (sessionStorage.getItem(COUPLE_ACTIVE_KEY) === "1") return;
    sessionStorage.setItem(COUPLE_ACTIVE_KEY, "1");
    trackFunnel("couple_active");
  } catch {
    trackFunnel("couple_active");
  }
}
