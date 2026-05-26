import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 관리자 계정 생성
  await prisma.account.upsert({
    where: { username: "admin@example.com" },
    update: {},
    create: {
      username: "admin@example.com",
      passwordHash: hashSync("admin1234", 10),
      role: "ADMIN",
      displayName: "관리자",
      groups: [],
    },
  });

  // 샘플 조직 생성
  const aUniv = await prisma.organization.upsert({
    where: { code: "a-univ" },
    update: {},
    create: {
      name: "A 대학교",
      code: "a-univ",
    },
  });

  const bUniv = await prisma.organization.upsert({
    where: { code: "b-univ" },
    update: {},
    create: {
      name: "B 대학교",
      code: "b-univ",
    },
  });

  // 샘플 구독 생성
  await prisma.subscription.upsert({
    where: { id: "seed-a-univ-sub" },
    update: {},
    create: {
      id: "seed-a-univ-sub",
      organizationId: aUniv.id,
      tier: "PRO",
      seatCount: 111,
      creditLimit: 1000,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-08-31"),
      awsAccountId: "123456789012",
      awsAccountAlias: "example",
    },
  });

  await prisma.subscription.upsert({
    where: { id: "seed-b-univ-sub" },
    update: {},
    create: {
      id: "seed-b-univ-sub",
      organizationId: bUniv.id,
      tier: "PRO",
      seatCount: 64,
      creditLimit: 1000,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-30"),
      awsAccountId: "123456789012",
      awsAccountAlias: "example",
    },
  });

  // 샘플 그룹 (레거시 경로 — 수업별 그룹)
  const groups = [
    { code: "a-univ-cs1", name: "캡스톤디자인1", orgId: aUniv.id },
    { code: "a-univ-cloud", name: "클라우드컴퓨팅", orgId: aUniv.id },
    { code: "a-univ-cs2", name: "캡스톤디자인2", orgId: aUniv.id },
    { code: "a-univ-ai", name: "AI기초", orgId: aUniv.id },
    { code: "a-univ-proj", name: "실전프로젝트", orgId: aUniv.id },
    { code: "b-univ-hackathon", name: "해커톤", orgId: bUniv.id },
  ];

  for (const g of groups) {
    await prisma.group.upsert({
      where: { organizationId_code: { organizationId: g.orgId, code: g.code } },
      update: {},
      create: { code: g.code, name: g.name, organizationId: g.orgId },
    });
  }

  // 샘플 Course (미래 경로 — 서버 관리 수업)
  const courses = [
    { code: "cloud-computing-2026-1", name: "클라우드컴퓨팅", orgId: aUniv.id, legacyGroupCode: "a-univ-cloud" },
    { code: "capstone-design-1-2026-1", name: "캡스톤디자인1", orgId: aUniv.id, legacyGroupCode: "a-univ-cs1" },
    { code: "ai-basics-2026-1", name: "AI기초", orgId: aUniv.id, legacyGroupCode: "a-univ-ai" },
    { code: "project-practice-2026-1", name: "실전프로젝트", orgId: aUniv.id, legacyGroupCode: "a-univ-proj" },
    { code: "hackathon-2026-03", name: "해커톤", orgId: bUniv.id, legacyGroupCode: "b-univ-hackathon" },
    { code: "capstone-design-2-2026-1", name: "캡스톤디자인2", orgId: aUniv.id, legacyGroupCode: "a-univ-cs2" },
  ];

  for (const c of courses) {
    await prisma.course.upsert({
      where: { organizationId_code: { organizationId: c.orgId, code: c.code } },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        semester: "2026-1",
        organizationId: c.orgId,
        legacyGroupCode: c.legacyGroupCode,
      },
    });
  }

  // SCHOOL 역할 계정 생성 (그룹 접근 제한)
  await prisma.account.upsert({
    where: { username: "a-univ-admin@example.com" },
    update: {},
    create: {
      username: "a-univ-admin@example.com",
      passwordHash: hashSync("a-univ1234", 10),
      role: "SCHOOL",
      displayName: "A 대학교 관리자",
      groups: ["a-univ-cs1", "a-univ-cloud"],
    },
  });

  // 시스템 정책 시드
  const systemPolicies = [
    {
      name: "AdminFullAccess",
      description: "관리자 전체 접근 권한",
      document: { version: "2026-04-05", statements: [{ effect: "allow", actions: ["*"], resources: ["*"] }] },
    },
    {
      name: "SalesOrgManage",
      description: "영업팀 — 조직/구독 관리 + 대시보드 읽기",
      document: { version: "2026-04-05", statements: [{ effect: "allow", actions: ["org:*", "sub:*", "dashboard:view", "report:view"], resources: ["*"] }] },
    },
    {
      name: "SchoolReadOnly",
      description: "학교 관리자 — 소속 그룹 읽기 전용",
      document: { version: "2026-04-05", statements: [{ effect: "allow", actions: ["dashboard:view", "user:view", "group:view", "course:view", "report:view"], resources: ["*"] }] },
    },
    {
      name: "DemoReadOnly",
      description: "데모 — 대시보드 읽기 전용",
      document: { version: "2026-04-05", statements: [{ effect: "allow", actions: ["dashboard:view", "report:view"], resources: ["*"] }] },
    },
  ];

  for (const p of systemPolicies) {
    await prisma.policy.upsert({
      where: { name: p.name },
      update: { description: p.description, document: p.document },
      create: { ...p, isSystem: true },
    });
  }

  console.log("Seed 완료: admin@example.com/admin1234, a-univ-admin@example.com/a-univ1234, 시스템 정책 4개");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
