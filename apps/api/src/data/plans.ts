import type { PlanCard } from "../domain/types";

const PLAN_CATALOG: readonly PlanCard[] = Object.freeze([
  {
    id: "plan_aquarium",
    emoji: "🐠",
    title: "水族館でゆったりデート",
    description: "薄暗い館内とクラゲの光で、ふたりだけの世界に浸れる定番。",
  },
  {
    id: "plan_cafe_hop",
    emoji: "☕",
    title: "新しいカフェ巡り",
    description: "気になっていた2〜3軒をはしごして、ベスト1を決める食べ歩き。",
  },
  {
    id: "plan_movie",
    emoji: "🎬",
    title: "話題の映画を観に行く",
    description: "観終わったあとの感想会まで含めて、ゆっくり1本に集中する日。",
  },
  {
    id: "plan_picnic",
    emoji: "🧺",
    title: "公園でピクニック",
    description: "コンビニで好きなものを買い込んで、芝生にレジャーシート。",
  },
  {
    id: "plan_hot_spring",
    emoji: "♨️",
    title: "日帰り温泉でリセット",
    description: "都心から行ける日帰り温泉で、平日疲れをまとめて流す。",
  },
  {
    id: "plan_bookstore",
    emoji: "📚",
    title: "大型書店でゆるく散策",
    description: "おすすめ本を1冊ずつ交換して、近くのカフェで読み合う。",
  },
  {
    id: "plan_cooking",
    emoji: "🍳",
    title: "おうちで一緒にごはんづくり",
    description: "材料を分担して買い出し、晩ごはんからデザートまで二人で作る。",
  },
  {
    id: "plan_arcade",
    emoji: "🎮",
    title: "ゲームセンターで真剣勝負",
    description: "クレーンゲームと音ゲーで、勝ったほうが翌週のおごり権を獲得。",
  },
  {
    id: "plan_night_view",
    emoji: "🌃",
    title: "夜景の見える展望スポット",
    description: "高層階のラウンジか展望デッキで、ゆっくり話す時間。",
  },
  {
    id: "plan_walk",
    emoji: "👟",
    title: "ふらっと街歩き",
    description: "目的を決めずに歩いて、気になったお店に入る自由デー。",
  },
  {
    id: "plan_zoo",
    emoji: "🦁",
    title: "動物園で童心デート",
    description: "推し動物を1種ずつ決めて、ふたりで写真をひたすら撮る。",
  },
  {
    id: "plan_studio",
    emoji: "📷",
    title: "プリ機・写真スタジオで記録",
    description: "今のふたりを写真で残す日。後日アルバムにまとめる前提。",
  },
  {
    id: "plan_camping",
    emoji: "🏕️",
    title: "近場のデイキャンプ",
    description: "手ぶらレンタル可能な施設で、焚き火とごはんを楽しむ。",
  },
  {
    id: "plan_concert",
    emoji: "🎤",
    title: "気になるライブ・イベント",
    description: "推しのアーティストや小規模イベントに2人で出かける日。",
  },
]) as readonly PlanCard[];

export function getPlanCatalog(): PlanCard[] {
  return PLAN_CATALOG.map((p) => ({ ...p }));
}

export function findPlanById(planId: string): PlanCard | null {
  const found = PLAN_CATALOG.find((p) => p.id === planId);
  return found ? { ...found } : null;
}
