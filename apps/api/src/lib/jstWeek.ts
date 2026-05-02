const JST = "Asia/Tokyo";

const WD_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** JST のカレンダー日 YYYY-MM-DD */
export function jstYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: JST });
}

/** JST で月曜=0 … 日曜=6 */
export function jstDayOfWeekMon0(d: Date): number {
  const wd = d.toLocaleDateString("en-US", { timeZone: JST, weekday: "short" });
  const i = WD_ORDER.indexOf(wd as (typeof WD_ORDER)[number]);
  return i >= 0 ? i : 0;
}

/**
 * anchor の瞬間を含む JST 週の月曜日 YYYY-MM-DD と、
 * [月曜 00:00 JST, 次月曜 00:00 JST) の ISO 範囲。
 */
export function jstWeekRangeContaining(anchor: Date): {
  weekStart: string;
  startIso: string;
  endIso: string;
} {
  const ymd = jstYmd(anchor);
  const dow = jstDayOfWeekMon0(anchor);
  const noon = new Date(`${ymd}T12:00:00+09:00`);
  noon.setDate(noon.getDate() - dow);
  const weekStart = jstYmd(noon);
  const startIso = new Date(`${weekStart}T00:00:00+09:00`).toISOString();
  const end = new Date(`${weekStart}T00:00:00+09:00`);
  end.setDate(end.getDate() + 7);
  const endIso = end.toISOString();
  return { weekStart, startIso, endIso };
}

/** week_start（月曜 YYYY-MM-DD）に対応する日曜の表示用 YYYY-MM-DD（JST） */
export function jstSundayYmdAfterMonday(weekStartMonday: string): string {
  const mon = new Date(`${weekStartMonday}T12:00:00+09:00`);
  mon.setDate(mon.getDate() + 6);
  return jstYmd(mon);
}
