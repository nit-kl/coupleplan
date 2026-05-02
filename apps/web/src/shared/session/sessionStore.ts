type SessionListener = (accessToken: string) => void;

let currentAccessToken = "";
const listeners = new Set<SessionListener>();

export function setAccessToken(token: string): void {
  currentAccessToken = token;
  for (const listener of listeners) {
    try {
      listener(token);
    } catch {
      // listener errors must not break other subscribers
    }
  }
}

export function getAccessToken(): string {
  return currentAccessToken;
}

export function subscribeAccessToken(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
