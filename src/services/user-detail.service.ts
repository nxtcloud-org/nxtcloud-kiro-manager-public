import { prisma } from "@/lib/prisma";

export interface UserDetail {
  profile: {
    userId: string;
    displayName: string;
    email: string | null;
    schoolCode: string | null;
    studentId: string | null;
    userType: string | null;
    username: string | null;
    courses: { name: string; team: string | null }[];
  };
  summary: {
    totalMessages: number;
    activeDays: number;
    avgDailyMessages: number;
    totalPromptChars: number;
    totalResponseChars: number;
    avgPromptLength: number;
    avgResponseLength: number;
    firstActiveDate: string | null;
    lastActiveDate: string | null;
  };
  daily: { date: string; messages: number }[];
  hourly: { hour: number; messages: number }[];
  models: { model: string; count: number }[];
  triggerTypes: { type: string; count: number }[];
  credits: {
    date: string;
    creditsUsed: number;
    chatConversations: number;
    totalMessages: number;
    subscriptionTier: string | null;
  }[];
}

export async function getUserDetail(
  userId: string,
  start: string,
  end: string,
): Promise<UserDetail | null> {
  const user = await prisma.kiroUser.findUnique({
    where: { userId },
    select: {
      userId: true,
      displayName: true,
      email: true,
      schoolCode: true,
      studentId: true,
      userType: true,
      username: true,
      courseEnrollments: {
        select: { teamName: true, course: { select: { name: true } } },
      },
    },
  });

  if (!user) return null;

  const msgWhere = { userId, date: { gte: start, lte: end } };

  const [stats, dailyData, hourlyData, modelData, triggerData, activeDates, creditData] =
    await Promise.all([
      prisma.message.aggregate({
        where: msgWhere,
        _count: true,
        _sum: { promptLength: true, responseLength: true },
        _avg: { promptLength: true, responseLength: true },
      }),
      prisma.message.groupBy({
        by: ["date"],
        where: msgWhere,
        _count: true,
        orderBy: { date: "asc" },
      }),
      prisma.message.groupBy({
        by: ["hour"],
        where: msgWhere,
        _count: true,
        orderBy: { hour: "asc" },
      }),
      prisma.message.groupBy({
        by: ["modelId"],
        where: msgWhere,
        _count: true,
        orderBy: { _count: { modelId: "desc" } },
      }),
      prisma.message.groupBy({
        by: ["chatTriggerType"],
        where: msgWhere,
        _count: true,
      }),
      prisma.message.findMany({
        where: msgWhere,
        select: { date: true },
        distinct: ["date"],
        orderBy: { date: "asc" },
      }),
      prisma.userReport.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: {
          date: true,
          creditsUsed: true,
          chatConversations: true,
          totalMessages: true,
          subscriptionTier: true,
        },
        orderBy: { date: "asc" },
      }),
    ]);

  const activeDays = activeDates.length;
  const totalMessages = stats._count;

  // 24시간 빈 데이터 채우기
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: 0 }));
  for (const h of hourlyData) {
    hourly[h.hour].messages = h._count;
  }

  return {
    profile: {
      userId: user.userId,
      displayName: user.displayName,
      email: user.email,
      schoolCode: user.schoolCode,
      studentId: user.studentId,
      userType: user.userType,
      username: user.username,
      courses: user.courseEnrollments.map((ce) => ({
        name: ce.course.name,
        team: ce.teamName,
      })),
    },
    summary: {
      totalMessages,
      activeDays,
      avgDailyMessages:
        activeDays > 0 ? Math.round((totalMessages / activeDays) * 10) / 10 : 0,
      totalPromptChars: stats._sum.promptLength ?? 0,
      totalResponseChars: stats._sum.responseLength ?? 0,
      avgPromptLength: Math.round(stats._avg.promptLength ?? 0),
      avgResponseLength: Math.round(stats._avg.responseLength ?? 0),
      firstActiveDate: activeDates[0]?.date ?? null,
      lastActiveDate: activeDates[activeDates.length - 1]?.date ?? null,
    },
    daily: dailyData.map((d) => ({ date: d.date, messages: d._count })),
    hourly,
    models: modelData.map((m) => ({
      model: m.modelId ?? "unknown",
      count: m._count,
    })),
    triggerTypes: triggerData.map((t) => ({
      type: t.chatTriggerType ?? "unknown",
      count: t._count,
    })),
    credits: creditData.map((c) => ({
      date: c.date,
      creditsUsed: Math.round(c.creditsUsed * 100) / 100,
      chatConversations: c.chatConversations,
      totalMessages: c.totalMessages,
      subscriptionTier: c.subscriptionTier,
    })),
  };
}
