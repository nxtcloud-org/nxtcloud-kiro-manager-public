import { prisma } from "@/lib/prisma";

interface DailyInsightParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export interface DailyUsageInsight {
  totalDays: number;
  activeDays: number;
  busiestDay: { date: string; messages: number; dayOfWeek: string } | null;
  quietestDay: { date: string; messages: number; dayOfWeek: string } | null;
  weekdayAvg: number;
  weekendAvg: number;
  weekendRatio: string;
  trend: "up" | "down" | "stable";
  trendPct: number;
}

export interface HourlyUsageInsight {
  totalMessages: number;
  peakHour: number;
  peakMessages: number;
  peakShare: number;
  nightMessages: number;
  nightShare: number;
  activeHours: number;
  morningMessages: number;
  afternoonMessages: number;
  eveningMessages: number;
  nightPeriodMessages: number;
  morningShare: number;
  afternoonShare: number;
  eveningShare: number;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export async function getDailyUsageInsight({
  start,
  end,
  groupCodes,
}: DailyInsightParams): Promise<DailyUsageInsight> {
  const userFilter = groupCodes?.length
    ? {
        kiroUser: {
          userGroups: { some: { group: { code: { in: groupCodes } } } },
        },
      }
    : {};

  const dailyData = await prisma.message.groupBy({
    by: ["date"],
    where: { date: { gte: start, lte: end }, ...userFilter },
    _count: true,
    orderBy: { date: "asc" },
  });

  const totalDays = Math.max(
    1,
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1,
  );
  const activeDays = dailyData.length;

  // 요일별 분류
  let weekdayTotal = 0;
  let weekdayCount = 0;
  let weekendTotal = 0;
  let weekendCount = 0;

  for (const d of dailyData) {
    const dayOfWeek = new Date(d.date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendTotal += d._count;
      weekendCount++;
    } else {
      weekdayTotal += d._count;
      weekdayCount++;
    }
  }

  const weekdayAvg = weekdayCount > 0 ? Math.round(weekdayTotal / weekdayCount) : 0;
  const weekendAvg = weekendCount > 0 ? Math.round(weekendTotal / weekendCount) : 0;
  const weekendRatio =
    weekdayAvg > 0
      ? `${Math.round((weekendAvg / weekdayAvg) * 100)}%`
      : "-";

  // 가장 바쁜/한가한 날
  const sorted = [...dailyData].sort((a, b) => b._count - a._count);
  const busiest = sorted[0];
  const quietest = sorted[sorted.length - 1];

  // 트렌드 (전반 vs 후반)
  const mid = Math.floor(dailyData.length / 2);
  const firstHalf = dailyData.slice(0, mid);
  const secondHalf = dailyData.slice(mid);
  const firstAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d._count, 0) / firstHalf.length
      : 0;
  const secondAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d._count, 0) / secondHalf.length
      : 0;
  const trendPct =
    firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
  const trend: "up" | "down" | "stable" =
    trendPct > 10 ? "up" : trendPct < -10 ? "down" : "stable";

  return {
    totalDays,
    activeDays,
    busiestDay: busiest
      ? {
          date: busiest.date,
          messages: busiest._count,
          dayOfWeek: DAY_NAMES[new Date(busiest.date).getDay()],
        }
      : null,
    quietestDay: quietest
      ? {
          date: quietest.date,
          messages: quietest._count,
          dayOfWeek: DAY_NAMES[new Date(quietest.date).getDay()],
        }
      : null,
    weekdayAvg,
    weekendAvg,
    weekendRatio,
    trend,
    trendPct: Math.abs(trendPct),
  };
}

export async function getHourlyUsageInsight({
  date,
  groupCodes,
}: {
  date: string;
  groupCodes?: string[];
}): Promise<HourlyUsageInsight> {
  const userFilter = groupCodes?.length
    ? {
        kiroUser: {
          userGroups: { some: { group: { code: { in: groupCodes } } } },
        },
      }
    : {};

  const hourlyData = await prisma.message.groupBy({
    by: ["hour"],
    where: { date, ...userFilter },
    _count: true,
    orderBy: { hour: "asc" },
  });

  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    messages: 0,
  }));
  for (const d of hourlyData) {
    hours[d.hour].messages = d._count;
  }

  const totalMessages = hours.reduce((s, h) => s + h.messages, 0);
  const peak = hours.reduce((max, h) =>
    h.messages > max.messages ? h : max,
  );
  const activeHours = hours.filter((h) => h.messages > 0).length;

  // 시간대 구분 (KST 기준)
  const morning = hours.filter((h) => h.hour >= 6 && h.hour < 12);
  const afternoon = hours.filter((h) => h.hour >= 12 && h.hour < 18);
  const evening = hours.filter((h) => h.hour >= 18 && h.hour < 22);
  const night = hours.filter(
    (h) => h.hour >= 22 || h.hour < 6,
  );

  const morningMessages = morning.reduce((s, h) => s + h.messages, 0);
  const afternoonMessages = afternoon.reduce((s, h) => s + h.messages, 0);
  const eveningMessages = evening.reduce((s, h) => s + h.messages, 0);
  const nightPeriodMessages = night.reduce((s, h) => s + h.messages, 0);

  const pct = (n: number) =>
    totalMessages > 0 ? Math.round((n / totalMessages) * 100) : 0;

  return {
    totalMessages,
    peakHour: peak.hour,
    peakMessages: peak.messages,
    peakShare: pct(peak.messages),
    nightMessages: nightPeriodMessages,
    nightShare: pct(nightPeriodMessages),
    activeHours,
    morningMessages,
    afternoonMessages,
    eveningMessages,
    nightPeriodMessages,
    morningShare: pct(morningMessages),
    afternoonShare: pct(afternoonMessages),
    eveningShare: pct(eveningMessages),
  };
}
