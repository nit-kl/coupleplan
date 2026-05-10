import { HttpError } from "../../shared/api/httpClient";
import { getMyCouple } from "./api";
import type { CoupleMeResponse } from "./types";

export function isFullyPairedCouple(couple: CoupleMeResponse | undefined): boolean {
  return Boolean(couple && couple.status === "active" && couple.members.length >= 2);
}

export async function getMyCoupleOptional(accessToken: string): Promise<CoupleMeResponse | undefined> {
  try {
    return await getMyCouple(accessToken);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return undefined;
    throw e;
  }
}
