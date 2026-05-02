import type { NinjaMissionCard } from "../domain/types";

const CATALOG: NinjaMissionCard[] = [
  {
    id: "nj_shoes",
    emoji: "👟",
    title: "靴をそろえる",
    description: "玄関まわりをスッキリ。",
    point: 3,
  },
  {
    id: "nj_sink",
    emoji: "🧽",
    title: "水回りをふく",
    description: "洗面・キッチンをサッとひと拭き。",
    point: 4,
  },
  {
    id: "nj_trash",
    emoji: "🗑️",
    title: "ゴミ出し",
    description: "分別どおりに出した日。",
    point: 5,
  },
  {
    id: "nj_laundry",
    emoji: "🧺",
    title: "洗濯まわし",
    description: "干す／取り込みまで含む。",
    point: 4,
  },
  {
    id: "nj_bed",
    emoji: "🛏️",
    title: "ベッドメイク",
    description: "シーツのズレ直しでもOK。",
    point: 2,
  },
  {
    id: "nj_surprise",
    emoji: "🎁",
    title: "ちいさなサプライズ",
    description: "お気に入りのおやつを用意など。",
    point: 6,
  },
];

export function getNinjaMissionCatalog(): NinjaMissionCard[] {
  return [...CATALOG];
}

export function findNinjaMissionById(id: string): NinjaMissionCard | undefined {
  return CATALOG.find((m) => m.id === id);
}
