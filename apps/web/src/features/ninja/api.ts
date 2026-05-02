import { requestJson } from "../../shared/api/httpClient";
import type { NinjaMissionCard, NinjaWeekView } from "./types";

export function getNinjaMissions(accessToken: string): Promise<{ missions: NinjaMissionCard[] }> {
  return requestJson<{ missions: NinjaMissionCard[] }>("/ninja/missions", "GET", { accessToken });
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
