import { prisma } from "@/lib/prisma";

interface ReportParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export interface UtilizationReport {
  period: { start: string; end: string; days: number };
  headline: {
    registeredStudents: number;
    activeStudents: number;
    utilizationRate: number;
    totalMessages: number;
    avgDailyPerUser: number;
  };
  courseBreakdown: {
    name: string;
    registered: number;
    active: number;
    utilizationRate: number;
    messages: number;
    avgPerUser: number;
  }[];
  engagement: {
    heavyUsers: number;      // 100+ messages
    regularUsers: number;    // 10-100
    lightUsers: number;      // 1-10
    neverUsed: number;       // 0
  };
  timePattern: {
    weekdayShare: number;
    weekendShare: number;
    nightShare: number;      // 22-06시
    peakHour: number;
  };
  topStudents: {
    displayName: string;
    schoolCode: string | null;
    messages: number;
    courses: string[];
  }[];
}

export async function getUtilizationReport({
  start,
  end,
  groupCodes,
}: ReportParams): Promise<UtilizationReport> {
  const groupFilter = groupCodes?.length
    ? { userGroups: { some: { group: { code: { in: groupCodes } } } } }
    : {};
  const msgFilter = groupCodes?.length
    ? { kiroUser: { userGroups: { some: { group: { code: { in: groupCodes } } } } } }
    : {};

  const days = Math.max(1, Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1);

  // 전체 학생
  const registeredStudents = await prisma.kiroUser.count({
    where: { userType: "student", ...groupFilter },
  });

  // 활성 학생
  const activeUserIds = await prisma.message.findMany({
    where: { date: { gte: start, lte: end }, ...msgFilter },
    select: { userId: true },
    distinct: ["userId"],
  });
  const activeStudents = activeUserIds.length;
  const utilizationRate = registeredStudents > 0 ? Math.round((activeStudents / registeredStudents) * 100) : 0;

  // 총 메시지
  const totalMessages = await prisma.message.count({
    where: { date: { gte: start, lte: end }, ...msgFilter },
  });
  const avgDailyPerUser = activeStudents > 0
    ? Math.round((totalMessages / activeStudents / days) * 10) / 10
    : 0;

  // 수업별 분석
  const groups = await prisma.group.findMany({
    where: groupCodes?.length ? { code: { in: groupCodes } } : {},
    include: { organization: { select: { name: true } } },
  });

  const courseBreakdown = await Promise.all(
    groups.map(async (group) => {
      const userIds = await prisma.userGroup.findMany({
        where: { groupId: group.id },
        select: { userId: true },
      });
      const uidList = userIds.map((u) => u.userId);
      if (uidList.length === 0) return { name: group.name, registered: 0, active: 0, utilizationRate: 0, messages: 0, avgPerUser: 0 };

      const [msgs, actives] = await Promise.all([
        prisma.message.count({ where: { userId: { in: uidList }, date: { gte: start, lte: end } } }),
        prisma.message.findMany({ where: { userId: { in: uidList }, date: { gte: start, lte: end } }, select: { userId: true }, distinct: ["userId"] }),
      ]);

      return {
        name: group.name,
        registered: uidList.length,
        active: actives.length,
        utilizationRate: uidList.length > 0 ? Math.round((actives.length / uidList.length) * 100) : 0,
        messages: msgs,
        avgPerUser: actives.length > 0 ? Math.round(msgs / actives.length) : 0,
      };
    }),
  );
  courseBreakdown.sort((a, b) => b.messages - a.messages);

  // 사용 강도 분류
  const userMsgCounts = await prisma.message.groupBy({
    by: ["userId"],
    where: { date: { gte: start, lte: end }, ...msgFilter },
    _count: true,
  });
  const msgCountMap = new Map(userMsgCounts.map((u) => [u.userId, u._count]));

  let heavyUsers = 0;
  let regularUsers = 0;
  let lightUsers = 0;
  for (const count of msgCountMap.values()) {
    if (count >= 100) heavyUsers++;
    else if (count >= 10) regularUsers++;
    else lightUsers++;
  }
  const neverUsed = Math.max(0, registeredStudents - activeStudents);

  // 시간대 패턴
  const hourlyData = await prisma.message.groupBy({
    by: ["hour"],
    where: { date: { gte: start, lte: end }, ...msgFilter },
    _count: true,
  });

  let weekdayMsgs = 0;
  let weekendMsgs = 0;
  // 요일별은 date 기반으로 계산
  const dailyData = await prisma.message.groupBy({
    by: ["date"],
    where: { date: { gte: start, lte: end }, ...msgFilter },
    _count: true,
  });
  for (const d of dailyData) {
    const dow = new Date(d.date).getDay();
    if (dow === 0 || dow === 6) weekendMsgs += d._count;
    else weekdayMsgs += d._count;
  }

  const nightHours = hourlyData.filter((h) => h.hour >= 22 || h.hour < 6);
  const nightMsgs = nightHours.reduce((s, h) => s + h._count, 0);
  const nightShare = totalMessages > 0 ? Math.round((nightMsgs / totalMessages) * 100) : 0;
  const weekdayShare = totalMessages > 0 ? Math.round((weekdayMsgs / totalMessages) * 100) : 0;
  const weekendShare = totalMessages > 0 ? Math.round((weekendMsgs / totalMessages) * 100) : 0;
  const peak = hourlyData.reduce((max, h) => h._count > max._count ? h : max, { hour: 0, _count: 0 });

  // TOP 10 학생
  const topUserData = userMsgCounts.sort((a, b) => b._count - a._count).slice(0, 10);
  const topUserIds = topUserData.map((u) => u.userId);
  const topUsers = await prisma.kiroUser.findMany({
    where: { userId: { in: topUserIds } },
    select: {
      userId: true,
      displayName: true,
      schoolCode: true,
      courseEnrollments: { select: { course: { select: { name: true } } } },
    },
  });
  const topUserMap = Object.fromEntries(topUsers.map((u) => [u.userId, u]));

  const topStudents = topUserData.map((u) => {
    const user = topUserMap[u.userId];
    return {
      displayName: user?.displayName ?? u.userId,
      schoolCode: user?.schoolCode ?? null,
      messages: u._count,
      courses: user?.courseEnrollments.map((ce) => ce.course.name) ?? [],
    };
  });

  return {
    period: { start, end, days },
    headline: { registeredStudents, activeStudents, utilizationRate, totalMessages, avgDailyPerUser },
    courseBreakdown,
    engagement: { heavyUsers, regularUsers, lightUsers, neverUsed },
    timePattern: { weekdayShare, weekendShare, nightShare, peakHour: peak.hour },
    topStudents,
  };
}
