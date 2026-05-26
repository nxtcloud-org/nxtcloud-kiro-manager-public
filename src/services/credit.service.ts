import { prisma } from "@/lib/prisma";

interface DateRangeParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export async function getCreditSummary({
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

  const stats = await prisma.userReport.aggregate({
    where: { date: { gte: start, lte: end }, ...userFilter },
    _sum: { creditsUsed: true, overageCreditsUsed: true },
    _avg: { creditsUsed: true },
    _count: true,
  });

  const tierBreakdown = await prisma.userReport.groupBy({
    by: ["subscriptionTier"],
    where: { date: { gte: start, lte: end }, ...userFilter },
    _sum: { creditsUsed: true },
    _count: true,
  });

  return {
    totalCredits: stats._sum.creditsUsed ?? 0,
    totalOverage: stats._sum.overageCreditsUsed ?? 0,
    avgCreditsPerReport: Math.round((stats._avg.creditsUsed ?? 0) * 100) / 100,
    reportCount: stats._count,
    tierBreakdown: tierBreakdown.map((t) => ({
      tier: t.subscriptionTier ?? "UNKNOWN",
      totalCredits: t._sum.creditsUsed ?? 0,
      count: t._count,
    })),
  };
}

export async function getDailyCredits({
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

  return prisma.userReport.groupBy({
    by: ["date"],
    where: { date: { gte: start, lte: end }, ...userFilter },
    _sum: { creditsUsed: true },
    orderBy: { date: "asc" },
  });
}

export async function getTopCreditUsers({
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

  const topUsers = await prisma.userReport.groupBy({
    by: ["userId"],
    where: { date: { gte: start, lte: end }, ...userFilter },
    _sum: { creditsUsed: true, overageCreditsUsed: true },
    orderBy: { _sum: { creditsUsed: "desc" } },
    take: limit,
  });

  const userIds = topUsers.map((u) => u.userId);
  const users = await prisma.kiroUser.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, displayName: true, email: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));

  return topUsers.map((u) => ({
    userId: u.userId,
    displayName: userMap[u.userId]?.displayName ?? u.userId,
    email: userMap[u.userId]?.email ?? null,
    totalCredits: u._sum.creditsUsed ?? 0,
    totalOverage: u._sum.overageCreditsUsed ?? 0,
  }));
}
