import { requestJson } from "../../shared/api/httpClient";
import type {
  PlanCard,
  RouletteSessionView,
  RouletteVoteSubmission,
} from "./types";

export function getPlans(accessToken: string): Promise<{ plans: PlanCard[] }> {
  return requestJson<{ plans: PlanCard[] }>("/roulette/plans", "GET", { accessToken });
}

export function getSession(accessToken: string): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>("/roulette/sessions/me", "GET", { accessToken });
}

export function submitVotes(
  accessToken: string,
  votes: RouletteVoteSubmission[],
): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>("/roulette/sessions/me/votes", "POST", {
    accessToken,
    body: { votes },
  });
}

export function spinSession(accessToken: string): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>("/roulette/sessions/me/spin", "POST", { accessToken });
}

export function restartSession(accessToken: string): Promise<RouletteSessionView> {
  return requestJson<RouletteSessionView>("/roulette/sessions/me/restart", "POST", { accessToken });
}
