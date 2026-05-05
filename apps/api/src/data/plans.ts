import type { PlanCard } from "../domain/types";

const PLAN_CATALOG: readonly PlanCard[] = Object.freeze([
  {
    id: "plan_aquarium",
    emoji: "🐧",
    title: "水族館で「癒し」と「写真」デート",
    description:
      "真っ暗な水槽の前で時間が止まる感じ、ふたりだけのペンギンみたいに並んで歩く。出口のショップでお土産を1つだけ共同決定するのも定番の儀式。",
  },
  {
    id: "plan_cafe_hop",
    emoji: "☕",
    title: "カフェはしごで「今日のMVPドリンク」決定戦",
    description:
      "気になっていた店を2〜3軒だけ回って、ドリンクとスイーツをシェア。最後に「今日いち推しはどれ？」と採点して、ふたりのベスト1を決める。",
  },
  {
    id: "plan_movie",
    emoji: "🎬",
    title: "映画1本＋感想デザートのミニ上映会",
    description:
      "観る前に「帰りに話したいテーマ」を1つだけ決めておく。終わったらカフェか帰り道で感想タイム。泣いた・笑ったシーンを教え合うだけで十分。",
  },
  {
    id: "plan_picnic",
    emoji: "🧺",
    title: "公園ピクニック（コンビニグルメ大会）",
    description:
      "レジャーシートと飲み物は持参、おかずはコンビニで500円ずつ縛り買い。芝生の上で「これ買って大正解」を自慢し合う、のんびり昼デート。",
  },
  {
    id: "plan_hot_spring",
    emoji: "♨️",
    title: "日帰り温泉で「週のリセット」デー",
    description:
      "湯上がりのアイスと休憩スペースがゴール。帰りの車中・電車で「今週よかったこと1つずつ」を言うと、だいたい気持ちが軽くなる。",
  },
  {
    id: "plan_bookstore",
    emoji: "📚",
    title: "大型書店で「おすすめ1冊」交換デート",
    description:
      "互いに「これ読んでみて」と1冊だけ選んで渡し合う。近くのカフェで表紙をめくる時間もデートの一部。買わずに立ち読みだけでもOK。",
  },
  {
    id: "plan_cooking",
    emoji: "🍳",
    title: "おうち協力クッキング（分担ルール決め）",
    description:
      "買い出しは片方がリスト、片方がカゴ担当など役割を先に分ける。失敗しても笑い話になるメニューがおすすめ。片付けまで含めてゴール。",
  },
  {
    id: "plan_arcade",
    emoji: "🎮",
    title: "ゲーセンで「罰ゲームなし」軽勝負",
    description:
      "クレーン、リズムゲー、レースなんでも。ルールは「負けてもおごりは今日だけ」。景品はふたりの思い出用に1個だけ持ち帰り。",
  },
  {
    id: "plan_night_view",
    emoji: "🌃",
    title: "夜景スポットで「ふたりの来年の話」",
    description:
      "展望台でも屋上でも、街の明かりを見ながらゆっくり喋る用のプラン。写真より会話がメイン。寒い季節はホットドリンク必須。",
  },
  {
    id: "plan_walk",
    emoji: "👟",
    title: "目的地なしの「寄り道だけ」散歩",
    description:
      "地図は閉じて、気になる看板と匂いに従うだけ。入った店の名前を後でメモして「ふたりの秘密マップ」にするのも楽しい。",
  },
  {
    id: "plan_zoo",
    emoji: "🦁",
    title: "動物園で「推し動物リサーチ」デート",
    description:
      "入園したらまず互いの「今日の推し枠」を決める。解説を読みながら豆知識を教え合い、最後に推しの前で記念撮影。童心全開でOK。",
  },
  {
    id: "plan_studio",
    emoji: "📷",
    title: "プリ・セルフ写真館で「今のふたり」記録",
    description:
      "キメ顔より変顔も混ぜると後で見返したとき幸せ度が上がる。データも紙も残せる店なら、1枚は冷蔵庫に貼る約束を。",
  },
  {
    id: "plan_camping",
    emoji: "🏕️",
    title: "近場デイキャンプ（火とごはんが主役）",
    description:
      "手ぶらOKの施設なら準備ゼロで気分だけ本格派。焚き火・BBQ・コーヒーのどれか1つに絞って、「非日常感」を味わう半日。",
  },
  {
    id: "plan_concert",
    emoji: "🎤",
    title: "ライブ・フェス・小劇場の「初体験ペア」",
    description:
      "お互いの「行ってみたかった場所」を交代でチョイするのもアリ。終演後の余韻で電車を逃しても、それはそれで思い出になる。",
  },
]) as readonly PlanCard[];

export function getPlanCatalog(): PlanCard[] {
  return PLAN_CATALOG.map((p) => ({ ...p }));
}

export function findPlanById(planId: string): PlanCard | null {
  const found = PLAN_CATALOG.find((p) => p.id === planId);
  return found ? { ...found } : null;
}
