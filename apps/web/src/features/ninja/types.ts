export type NinjaMissionCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  point: number;
};

export type NinjaLogItem = {
  id: string;
  missionId: string;
  title: string;
  point: number;
  createdAt: string;
};

export type NinjaWeekView = {
  weekStart: string;
  weekEnd: string;
  myUserId: string;
  myPoints: number;
  partnerPoints: number | null;
  publishedAt: string | null;
  myLogs: NinjaLogItem[];
};
