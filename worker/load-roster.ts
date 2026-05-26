/**
 * 학생 명단 JSON → TeamMember + CourseEnrollment 동시 적재
 * 사용법: pnpm tsx worker/load-roster.ts kiro-a-univ-cs-students.json
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("사용법: pnpm tsx worker/load-roster.ts <json-file>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  // 구조: { "a-univ-cs1": { "group1": [{ name, email }], ... }, "a-univ-cs2": { ... } }

  let totalTeamMembers = 0;
  let totalEnrollments = 0;
  let matchedUsers = 0;

  for (const [groupCode, teams] of Object.entries(raw)) {
    // 기존 Group 찾기 (TeamMember용)
    const group = await prisma.group.findFirst({ where: { code: groupCode } });
    if (!group) {
      console.warn(`[경고] Group "${groupCode}" 없음, TeamMember 건너뜀`);
    }

    // Course 찾기 (CourseEnrollment용, legacyGroupCode로 매칭)
    const course = await prisma.course.findFirst({
      where: { legacyGroupCode: groupCode },
    });
    if (!course) {
      console.warn(`[경고] Course with legacyGroupCode="${groupCode}" 없음, CourseEnrollment 건너뜀`);
    }

    for (const [teamName, members] of Object.entries(
      teams as Record<string, { name: string; email: string }[]>,
    )) {
      for (const member of members) {
        // 이메일로 KiroUser 매칭
        const kiroUser = await prisma.kiroUser.findFirst({
          where: { email: member.email },
        });

        // 1. TeamMember 적재 (기존 경로)
        if (group) {
          await prisma.teamMember.upsert({
            where: {
              groupId_email: { groupId: group.id, email: member.email },
            },
            update: {
              studentName: member.name,
              teamName,
              userId: kiroUser?.userId ?? null,
            },
            create: {
              groupId: group.id,
              teamName,
              studentName: member.name,
              email: member.email,
              userId: kiroUser?.userId ?? null,
            },
          });
          totalTeamMembers++;
        }

        // 2. CourseEnrollment 적재 (미래 경로)
        if (course && kiroUser) {
          await prisma.courseEnrollment.upsert({
            where: {
              userId_courseId: {
                userId: kiroUser.userId,
                courseId: course.id,
              },
            },
            update: { teamName },
            create: {
              userId: kiroUser.userId,
              courseId: course.id,
              teamName,
            },
          });
          totalEnrollments++;
          matchedUsers++;
        } else if (course && !kiroUser) {
          console.log(`  [미매칭] ${member.name} (${member.email}) — IC 사용자 없음`);
        }
      }
    }

    console.log(`[${groupCode}] 완료`);
  }

  console.log(`\n=== 적재 완료 ===`);
  console.log(`TeamMember: ${totalTeamMembers}건`);
  console.log(`CourseEnrollment: ${totalEnrollments}건 (IC 매칭: ${matchedUsers}명)`);

  // 검증
  const tmCount = await prisma.teamMember.count();
  const ceCount = await prisma.courseEnrollment.count();
  console.log(`\nDB 현황: TeamMember ${tmCount} / CourseEnrollment ${ceCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("적재 실패:", err);
  process.exit(1);
});
