import { prisma } from "@/lib/prisma";

interface DateRangeParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export async function getDailyActiveUsers({
  start,
  end,
  groupCodes,
}: DateRangeParams) {
  const userFilter = groupCodes?.length
    ? {
        kiroUser: {
          userGroups: { some: { group: { code: { in: groupCodes } } } },
        },
      }
    : {};

  const dailyMessages = await prisma.message.groupBy({
    by: ["date"],
    where: { date: { gte: start, lte: end }, ...userFilter },
    _count: true,
    orderBy: { date: "asc" },
  });

  // 일별 고유 사용자 수 계산
  const dates = dailyMessages.map((d) => d.date);
  const dailyUsers = await Promise.all(
    dates.map(async (date) => {
      const users = await prisma.message.findMany({
        where: { date, ...userFilter },
        select: { userId: true },
        distinct: ["userId"],
      });
      return { date, userCount: users.length };
    }),
  );

  const userCountMap = Object.fromEntries(
    dailyUsers.map((d) => [d.date, d.userCount]),
  );

  return dailyMessages.map((d) => ({
    date: d.date,
    messages: d._count,
    users: userCountMap[d.date] ?? 0,
  }));
}

export async function getHourlyActiveUsers({
  date,
  groupCodes,
}: {
  date: string;
  groupCodes?: string[];
}) {
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

  // 0-23시간 빈 데이터 채우기
  const result = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    messages: 0,
  }));

  for (const d of hourlyData) {
    result[d.hour].messages = d._count;
  }

  return result;
}
