import { API_BASE_URL } from "../config/env";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function requestJson<TResponse>(
  path: string,
  method: HttpMethod,
  options?: {
    body?: unknown;
    accessToken?: string;
  },
): Promise<TResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL が未設定です。Cloudflare Pages の「Settings」→「Environment variables」に、デプロイした Worker の URL（https://...workers.dev、末尾スラッシュなし）を Production（必要なら Preview も）で設定し、再デプロイしてください。",
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `HTTP ${response.status}`;
    throw new HttpError(message, response.status, payload);
  }

  return payload as TResponse;
}
