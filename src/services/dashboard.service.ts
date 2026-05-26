import { prisma } from "@/lib/prisma";

interface SummaryParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export async function getSummary({ start, end, groupCodes }: SummaryParams) {
  const userFilter = groupCodes?.length
    ? {
        kiroUser: {
          userGroups: { some: { group: { code: { in: groupCodes } } } },
        },
      }
    : {};

  const [messageStats, activeUsers, peakHour] = await Promise.all([
    prisma.message.aggregate({
      where: { date: { gte: start, lte: end }, ...userFilter },
      _count: true,
      _sum: { promptLength: true, responseLength: true },
    }),
    prisma.message.findMany({
      where: { date: { gte: start, lte: end }, ...userFilter },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.message.groupBy({
      by: ["hour"],
      where: { date: { gte: start, lte: end }, ...userFilter },
      _count: true,
      orderBy: { _count: { hour: "desc" } },
      take: 1,
    }),
  ]);

  const totalUsers = await prisma.kiroUser.count();

  return {
    totalMessages: messageStats._count,
    activeUsers: activeUsers.length,
    totalUsers,
    totalPromptChars: messageStats._sum.promptLength ?? 0,
    totalResponseChars: messageStats._sum.responseLength ?? 0,
    peakHour: peakHour[0]?.hour ?? null,
    peakHourCount: peakHour[0]?._count ?? 0,
    utilizationRate:
      totalUsers > 0
        ? Math.round((activeUsers.length / totalUsers) * 100)
        : 0,
  };
}

export async function getCollectionStatus() {
  const [totalFiles, lastCollected, totalMessages] = await Promise.all([
    prisma.collectionLog.count(),
    prisma.collectionMeta.findUnique({ where: { key: "last_checked_at" } }),
    prisma.message.count(),
  ]);

  return {
    totalFiles,
    totalMessages,
    lastCheckedAt: lastCollected?.value ?? null,
  };
}
