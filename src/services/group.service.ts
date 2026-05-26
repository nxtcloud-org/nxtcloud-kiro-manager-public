import { prisma } from "@/lib/prisma";

interface DateRangeParams {
  start: string;
  end: string;
  groupCodes?: string[];
}

export async function getGroups(groupCodes?: string[]) {
  const where = groupCodes?.length ? { code: { in: groupCodes } } : {};

  return prisma.group.findMany({
    where,
    include: {
      organization: { select: { name: true, code: true } },
      _count: { select: { userGroups: true, teamMembers: true } },
    },
    orderBy: { organization: { name: "asc" } },
  });
}

export async function getGroupStats({
  start,
  end,
  groupCodes,
}: DateRangeParams) {
  const groups = await getGroups(groupCodes);

  const stats = await Promise.all(
    groups.map(async (group) => {
      const userIds = await prisma.userGroup.findMany({
        where: { groupId: group.id },
        select: { userId: true },
      });
      const userIdList = userIds.map((u) => u.userId);

      if (userIdList.length === 0) {
        return {
          groupCode: group.code,
          groupName: group.name,
          orgName: group.organization.name,
          registered: 0,
          active: 0,
          messages: 0,
          utilizationRate: 0,
        };
      }

      const [messageCount, activeUsers] = await Promise.all([
        prisma.message.count({
          where: {
            userId: { in: userIdList },
            date: { gte: start, lte: end },
          },
        }),
        prisma.message.findMany({
          where: {
            userId: { in: userIdList },
            date: { gte: start, lte: end },
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
      ]);

      return {
        groupCode: group.code,
        groupName: group.name,
        orgName: group.organization.name,
        registered: userIdList.length,
        active: activeUsers.length,
        messages: messageCount,
        utilizationRate:
          userIdList.length > 0
            ? Math.round((activeUsers.length / userIdList.length) * 100)
            : 0,
      };
    }),
  );

  return stats;
}
