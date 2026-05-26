import { prisma } from "@/lib/prisma";

interface DateRangeParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export async function getTopUsers({
  start,
  end,
  groupCodes,
  limit = 20,
}: DateRangeParams & { limit?: number }) {
  const userFilter = groupCodes?.length
    ? {
        kiroUser: {
          userGroups: { some: { group: { code: { in: groupCodes } } } },
        },
      }
    : {};

  const topUsers = await prisma.message.groupBy({
    by: ["userId"],
    where: { date: { gte: start, lte: end }, ...userFilter },
    _count: true,
    _sum: { promptLength: true, responseLength: true },
    orderBy: { _count: { userId: "desc" } },
    take: limit,
  });

  const userIds = topUsers.map((u) => u.userId);
  const users = await prisma.kiroUser.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      displayName: true,
      email: true,
      userType: true,
      schoolCode: true,
      studentId: true,
      userGroups: { select: { group: { select: { code: true, name: true } } } },
      courseEnrollments: {
        select: {
          teamName: true,
          course: { select: { name: true, code: true } },
        },
      },
    },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));

  return topUsers.map((u) => {
    const user = userMap[u.userId];
    return {
      userId: u.userId,
      displayName: user?.displayName ?? u.userId,
      email: user?.email ?? null,
      userType: user?.userType ?? null,
      schoolCode: user?.schoolCode ?? null,
      studentId: user?.studentId ?? null,
      groups: user?.userGroups.map((ug) => ug.group.code) ?? [],
      courses: user?.courseEnrollments.map((ce) => ({
        name: ce.course.name,
        code: ce.course.code,
        team: ce.teamName,
      })) ?? [],
      messageCount: u._count,
      totalPromptChars: u._sum.promptLength ?? 0,
      totalResponseChars: u._sum.responseLength ?? 0,
    };
  });
}

export async function getUserDaily({
  userId,
  start,
  end,
}: {
  userId: string;
  start: string;
  end: string;
}) {
  return prisma.message.groupBy({
    by: ["date"],
    where: { userId, date: { gte: start, lte: end } },
    _count: true,
    orderBy: { date: "asc" },
  });
}
