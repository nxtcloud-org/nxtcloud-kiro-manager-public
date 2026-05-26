/**
 * 주간 프롬프트 분석 수동 실행
 * 사용법: pnpm tsx worker/run-analysis.ts --week 2026-03-24
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { runWeeklyAnalysis } from "./analyzers/prompt-analyzer";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BUCKET = process.env.S3_BUCKET!;
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID!;
const REGION = process.env.AWS_REGION ?? "us-east-1";

async function main() {
  const args = process.argv.slice(2);
  let weekStart: string | undefined;
  let weekEnd: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--week" && args[i + 1]) {
      weekStart = args[i + 1];
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      weekEnd = end.toISOString().slice(0, 10);
    }
  }

  await runWeeklyAnalysis(prisma, BUCKET, ACCOUNT_ID, REGION, weekStart, weekEnd);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("분석 실패:", err);
  process.exit(1);
});
