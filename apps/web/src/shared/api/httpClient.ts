import { API_BASE_URL } from "../config/env";

type HttpMethod = "GET" | "POST" | "PATCH";

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
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
