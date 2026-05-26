import { prisma } from "@/lib/prisma";

interface InsightParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export interface Insights {
  usage: UsageInsight;
  courses: CourseInsight;
  credits: CreditInsight;
}

interface UsageInsight {
  totalUsers: number;
  activeUsers: number;
  utilizationRate: number;
  inactiveUsers: number;
  avgDailyPerUser: number;
  totalMessages: number;
  days: number;
}

interface CourseInsight {
  totalCourses: number;
  topCourse: { name: string; messages: number; share: number } | null;
  bottomCourse: { name: string; utilizationRate: number } | null;
  gapRatio: number;
}

interface CreditInsight {
  totalCredits: number;
  avgPerUser: number;
  top10PctAvg: number;
  overallAvg: number;
  concentrationRatio: number;
  reportCount: number;
}

export async function getInsights({
  start,
  end,
  groupCodes,
}: InsightParams): Promise<Insights> {
  const [usage, courses, credits] = await Promise.all([
    computeUsageInsight(start, end, groupCodes),
    computeCourseInsight(start, end, groupCodes),
    computeCreditInsight(start, end, groupCodes),
  ]);

  return { usage, courses, credits };
}

async function computeUsageInsight(
  start: string,
  end: string,
  groupCodes?: string[],
): Promise<UsageInsight> {
  const userFilter = groupCodes?.length
    ? { userGroups: { some: { group: { code: { in: groupCodes } } } } }
    : {};

  const totalUsers = await prisma.kiroUser.count({
    where: { userType: "student", ...userFilter },
  });

  const activeUserIds = await prisma.message.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(groupCodes?.length
        ? { kiroUser: { userGroups: { some: { group: { code: { in: groupCodes } } } } } }
        : {}),
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const activeUsers = activeUserIds.length;
  const inactiveUsers = Math.max(0, totalUsers - activeUsers);
  const utilizationRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const totalMessages = await prisma.message.count({
    where: {
      date: { gte: start, lte: end },
      ...(groupCodes?.length
        ? { kiroUser: { userGroups: { some: { group: { code: { in: groupCodes } } } } } }
        : {}),
    },
  });

  const days = Math.max(1, Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1);

  const avgDailyPerUser = activeUsers > 0
    ? Math.round((totalMessages / activeUsers / days) * 10) / 10
    : 0;

  return { totalUsers, activeUsers, utilizationRate, inactiveUsers, avgDailyPerUser, totalMessages, days };
}

async function computeCourseInsight(
  start: string,
  end: string,
  groupCodes?: string[],
): Promise<CourseInsight> {
  const groups = await prisma.group.findMany({
    where: groupCodes?.length ? { code: { in: groupCodes } } : {},
    include: { organization: { select: { name: true } } },
  });

  if (groups.length === 0) {
    return { totalCourses: 0, topCourse: null, bottomCourse: null, gapRatio: 0 };
  }

  const courseStats = await Promise.all(
    groups.map(async (group) => {
      const userIds = await prisma.userGroup.findMany({
        where: { groupId: group.id },
        select: { userId: true },
      });
      const userIdList = userIds.map((u) => u.userId);
      if (userIdList.length === 0) {
        return { name: group.name, code: group.code, messages: 0, registered: 0, active: 0, utilizationRate: 0 };
      }

      const [messages, activeUsers] = await Promise.all([
        prisma.message.count({
          where: { userId: { in: userIdList }, date: { gte: start, lte: end } },
        }),
        prisma.message.findMany({
          where: { userId: { in: userIdList }, date: { gte: start, lte: end } },
          select: { userId: true },
          distinct: ["userId"],
        }),
      ]);

      return {
        name: group.name,
        code: group.code,
        messages,
        registered: userIdList.length,
        active: activeUsers.length,
        utilizationRate: userIdList.length > 0 ? Math.round((activeUsers.length / userIdList.length) * 100) : 0,
      };
    }),
  );

  const totalMessages = courseStats.reduce((sum, c) => sum + c.messages, 0);
  const sorted = [...courseStats].sort((a, b) => b.messages - a.messages);
  const top = sorted[0];
  const bottom = [...courseStats].filter((c) => c.registered > 0).sort((a, b) => a.utilizationRate - b.utilizationRate)[0];

  const maxMsg = sorted[0]?.messages ?? 0;
  const minMsg = sorted[sorted.length - 1]?.messages ?? 0;
  const gapRatio = minMsg > 0 ? Math.round((maxMsg / minMsg) * 10) / 10 : 0;

  return {
    totalCourses: courseStats.length,
    topCourse: top ? { name: top.name, messages: top.messages, share: totalMessages > 0 ? Math.round((top.messages / totalMessages) * 100) : 0 } : null,
    bottomCourse: bottom ? { name: bottom.name, utilizationRate: bottom.utilizationRate } : null,
    gapRatio,
  };
}

async function computeCreditInsight(
  start: string,
  end: string,
  groupCodes?: string[],
): Promise<CreditInsight> {
  const userFilter = groupCodes?.length
    ? { kiroUser: { userGroups: { some: { group: { code: { in: groupCodes } } } } } }
    : {};

  const reports = await prisma.userReport.findMany({
    where: { date: { gte: start, lte: end }, ...userFilter },
    select: { userId: true, creditsUsed: true },
  });

  if (reports.length === 0) {
    return { totalCredits: 0, avgPerUser: 0, top10PctAvg: 0, overallAvg: 0, concentrationRatio: 0, reportCount: 0 };
  }

  // 사용자별 합산
  const byUser = new Map<string, number>();
  for (const r of reports) {
    byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + r.creditsUsed);
  }

  const userCredits = [...byUser.values()].sort((a, b) => b - a);
  const totalCredits = userCredits.reduce((sum, c) => sum + c, 0);
  const overallAvg = Math.round((totalCredits / userCredits.length) * 10) / 10;

  const top10Count = Math.max(1, Math.ceil(userCredits.length * 0.1));
  const top10Sum = userCredits.slice(0, top10Count).reduce((sum, c) => sum + c, 0);
  const top10PctAvg = Math.round((top10Sum / top10Count) * 10) / 10;

  const concentrationRatio = overallAvg > 0 ? Math.round((top10PctAvg / overallAvg) * 10) / 10 : 0;

  return {
    totalCredits: Math.round(totalCredits * 10) / 10,
    avgPerUser: overallAvg,
    top10PctAvg,
    overallAvg,
    concentrationRatio,
    reportCount: reports.length,
  };
}
