function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

const fromEnv = import.meta.env.VITE_API_BASE_URL;

/**
 * 本番ビルドでは `VITE_API_BASE_URL` を必須（Cloudflare Pages の Environment variables で Worker URL を渡す）。
 * 未設定のまま `?? localhost` すると、バンドルに localhost が焼き付き本番で失敗するため、DEV のときだけフォールバックする。
 */
export const API_BASE_URL =
  fromEnv != null && fromEnv !== ""
    ? normalizeApiBaseUrl(fromEnv)
    : import.meta.env.DEV
      ? "http://localhost:8787"
      : "";
