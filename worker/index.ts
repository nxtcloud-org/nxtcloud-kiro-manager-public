import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env fallback

import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { collectGarLogs } from "./collectors/gar-collector";
import { collectUserReports } from "./collectors/report-collector";
import { syncIdentityCenterUsers } from "./collectors/user-sync";
import { sendSlackMessage } from "./notifiers/slack-notifier";
import { runWeeklyAnalysis } from "./analyzers/prompt-analyzer";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const BUCKET = process.env.S3_BUCKET ?? "";
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";
const IDENTITY_STORE_ID = process.env.IDENTITY_STORE_ID ?? "";
const INTERVAL = parseInt(process.env.COLLECT_INTERVAL_MINUTES ?? "15");
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL ?? "";

async function runCollection() {
  if (!BUCKET || !ACCOUNT_ID) {
    console.log("[Worker] S3_BUCKET 또는 AWS_ACCOUNT_ID 미설정, 수집 건너뜀");
    return;
  }

  console.log(`[Worker] 수집 시작 (${new Date().toISOString()})`);

  try {
    const garCount = await collectGarLogs(prisma, BUCKET, ACCOUNT_ID, REGION);
    const reportCount = await collectUserReports(prisma, BUCKET, ACCOUNT_ID, REGION);

    await prisma.collectionMeta.upsert({
      where: { key: "last_checked_at" },
      update: { value: new Date().toISOString() },
      create: { key: "last_checked_at", value: new Date().toISOString() },
    });

    console.log(`[Worker] 수집 완료: GAR ${garCount}건, Report ${reportCount}건`);

    if (garCount > 0 || reportCount > 0) {
      await sendSlackMessage(
        SLACK_WEBHOOK,
        `[KIRO Manager] 수집 완료: GAR ${garCount}건, Report ${reportCount}건`,
      );
    }
  } catch (err) {
    console.error("[Worker] 수집 실패:", err);
    await sendSlackMessage(SLACK_WEBHOOK, `[KIRO Manager] 수집 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
  }
}

async function runUserSync() {
  if (!IDENTITY_STORE_ID) return;

  console.log(`[Worker] 사용자 동기화 시작`);
  try {
    const count = await syncIdentityCenterUsers(prisma, IDENTITY_STORE_ID);
    console.log(`[Worker] 사용자 동기화 완료: ${count}명`);
  } catch (err) {
    console.error("[Worker] 사용자 동기화 실패:", err);
  }
}

async function main() {
  console.log("[Worker] nxt-kiro-manager 배치 워커 시작");
  console.log(`[Worker] 설정: bucket=${BUCKET}, account=${ACCOUNT_ID}, interval=${INTERVAL}분`);

  // 시작 즉시 1회 실행
  await runCollection();
  await runUserSync();

  // 수집: 매 N분
  cron.schedule(`*/${INTERVAL} * * * *`, runCollection);

  // 사용자 동기화: 6시간마다
  cron.schedule("0 */6 * * *", runUserSync);

  // 주간 프롬프트 분석: 매주 월요일 01:00 UTC (10:00 KST)
  cron.schedule("0 1 * * 1", async () => {
    console.log("[Worker] 주간 프롬프트 분석 시작");
    try {
      await runWeeklyAnalysis(prisma, BUCKET, ACCOUNT_ID, REGION);
      await sendSlackMessage(SLACK_WEBHOOK, "[KIRO Manager] 주간 프롬프트 분석 완료");
    } catch (err) {
      console.error("[Worker] 주간 분석 실패:", err);
      await sendSlackMessage(SLACK_WEBHOOK, `[KIRO Manager] 주간 분석 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    }
  });

  // 일일 리포트: 매일 09:00 KST (00:00 UTC)
  cron.schedule("0 0 * * *", async () => {
    const totalMessages = await prisma.message.count();
    const totalUsers = await prisma.kiroUser.count();
    await sendSlackMessage(
      SLACK_WEBHOOK,
      `[KIRO Manager 일일 리포트]\n총 메시지: ${totalMessages}\n총 사용자: ${totalUsers}`,
    );
  });

  console.log("[Worker] 스케줄 등록 완료, 대기 중...");
}

main().catch((err) => {
  console.error("[Worker] 치명적 에러:", err);
  process.exit(1);
});
