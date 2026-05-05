import { requestJson } from "../../shared/api/httpClient";
import type { NinjaMissionCard, NinjaWeekView } from "./types";

export function getNinjaMissions(accessToken: string): Promise<{ missions: NinjaMissionCard[] }> {
  return requestJson<{ missions: NinjaMissionCard[] }>("/ninja/missions", "GET", { accessToken });
}

export function postNinjaCustomMission(
  accessToken: string,
  payload: { title: string; point: 5 | 10 },
): Promise<{ mission: NinjaMissionCard; weeklyCreatedCount: number; weeklyCreateLimit: number }> {
  return requestJson("/ninja/missions/custom", "POST", { accessToken, body: payload });
}

export function getNinjaWeek(accessToken: string): Promise<NinjaWeekView> {
  return requestJson<NinjaWeekView>("/ninja/week", "GET", { accessToken });
}

export function postNinjaLog(
  accessToken: string,
  missionId: string,
): Promise<{ log: { id: string; missionId: string; title: string; point: number; createdAt: string } }> {
  return requestJson("/ninja/logs", "POST", { accessToken, body: { missionId } });
}

export function publishNinjaWeek(accessToken: string): Promise<NinjaWeekView> {
  return requestJson<NinjaWeekView>("/ninja/week/publish", "POST", { accessToken, body: {} });
}

export function resetNinjaWeek(accessToken: string): Promise<NinjaWeekView> {
  return requestJson<NinjaWeekView>("/ninja/week/reset", "POST", { accessToken, body: {} });
}
