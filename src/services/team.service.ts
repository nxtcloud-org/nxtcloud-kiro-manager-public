import { prisma } from "@/lib/prisma";

export async function getCourses(groupCodes?: string[]) {
  const where = groupCodes?.length ? { code: { in: groupCodes } } : {};

  const groups = await prisma.group.findMany({
    where,
    include: {
      organization: { select: { name: true } },
      _count: { select: { teamMembers: true } },
    },
  });

  return groups.map((g) => ({
    groupId: g.id,
    code: g.code,
    name: g.name,
    orgName: g.organization.name,
    memberCount: g._count.teamMembers,
  }));
}

export async function getTeams({
  groupCode,
  groupCodes,
}: {
  groupCode: string;
  groupCodes?: string[];
}) {
  if (groupCodes?.length && !groupCodes.includes(groupCode)) {
    return [];
  }

  const group = await prisma.group.findFirst({
    where: { code: groupCode },
  });
  if (!group) return [];

  const members = await prisma.teamMember.findMany({
    where: { groupId: group.id },
    orderBy: [{ teamName: "asc" }, { studentName: "asc" }],
  });

  const teamMap = new Map<
    string,
    { teamName: string; members: typeof members }
  >();
  for (const m of members) {
    if (!teamMap.has(m.teamName)) {
      teamMap.set(m.teamName, { teamName: m.teamName, members: [] });
    }
    teamMap.get(m.teamName)!.members.push(m);
  }

  return Array.from(teamMap.values());
}

export async function getTeamStats({
  groupCode,
  start,
  end,
  groupCodes,
}: {
  groupCode: string;
  start: string;
  end: string;
  groupCodes?: string[];
}) {
  const teams = await getTeams({ groupCode, groupCodes });

  const stats = await Promise.all(
    teams.map(async (team) => {
      const userIds = team.members
        .filter((m) => m.userId)
        .map((m) => m.userId!);

      if (userIds.length === 0) {
        return {
          teamName: team.teamName,
          memberCount: team.members.length,
          activeCount: 0,
          messages: 0,
        };
      }

      const [messageCount, activeUsers] = await Promise.all([
        prisma.message.count({
          where: {
            userId: { in: userIds },
            date: { gte: start, lte: end },
          },
        }),
        prisma.message.findMany({
          where: {
            userId: { in: userIds },
            date: { gte: start, lte: end },
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
      ]);

      return {
        teamName: team.teamName,
        memberCount: team.members.length,
        activeCount: activeUsers.length,
        messages: messageCount,
      };
    }),
  );

  return stats;
}
