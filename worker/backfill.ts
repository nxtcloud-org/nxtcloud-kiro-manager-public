/**
 * 과거 데이터 백필 스크립트
 * 사용법: pnpm backfill --from 2026-03-01 --to 2026-04-01
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { listS3Keys, getS3Object, buildGarPrefix, buildReportPrefix } from "../src/lib/s3";
import { parseGarFile } from "./parsers/gar-parser";
import { parseReportFile } from "./parsers/report-parser";

const CONCURRENCY = 30;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BUCKET = process.env.S3_BUCKET!;
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID!;
const REGION = process.env.AWS_REGION ?? "us-east-1";

async function parallel<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...await Promise.all(batch.map(fn)));
    if (i % (concurrency * 5) === 0 && i > 0) {
      console.log(`  진행: ${i}/${items.length}`);
    }
  }
  return results;
}

function parseDateRange(): { from: Date; to: Date } {
  const args = process.argv.slice(2);
  let from = "2026-03-01";
  let to = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) from = args[i + 1];
    if (args[i] === "--to" && args[i + 1]) to = args[i + 1];
  }

  console.log(`백필 기간: ${from} ~ ${to}`);
  return { from: new Date(from), to: new Date(to) };
}

function* dayRange(from: Date, to: Date) {
  const d = new Date(from);
  while (d <= to) {
    yield new Date(d);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function backfillGar(from: Date, to: Date) {
  console.log("\n=== GAR 로그 백필 ===");
  let totalInserted = 0;

  for (const day of dayRange(from, to)) {
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const dd = day.getUTCDate();
    const dateStr = day.toISOString().slice(0, 10);

    const prefix = buildGarPrefix(ACCOUNT_ID, REGION, year, month, dd);
    const allKeys = await listS3Keys(BUCKET, prefix);
    if (allKeys.length === 0) continue;

    // 이미 수집된 키 제외
    const collected = await prisma.collectionLog.findMany({
      where: { s3Key: { in: allKeys } },
      select: { s3Key: true },
    });
    const collectedSet = new Set(collected.map((c) => c.s3Key));
    const newKeys = allKeys.filter((k) => !collectedSet.has(k));

    if (newKeys.length === 0) {
      process.stdout.write(`${dateStr}: 이미 수집됨 (${allKeys.length}개)\n`);
      continue;
    }

    process.stdout.write(`${dateStr}: ${newKeys.length}개 다운로드 중...`);

    // 병렬 다운로드 + 파싱
    const results = await parallel(newKeys, CONCURRENCY, async (key) => {
      try {
        const bytes = await getS3Object(BUCKET, key);
        return { key, records: parseGarFile(bytes, key) };
      } catch {
        return { key, records: [] as ReturnType<typeof parseGarFile> };
      }
    });

    const flatRecords = results.flatMap((r) => r.records);
    const successKeys = results.filter((r) => r.records.length > 0).map((r) => r.key);

    if (flatRecords.length === 0) {
      process.stdout.write(" 파싱 결과 0건\n");
      continue;
    }

    // 사용자 배치 upsert
    const uniqueUserIds = [...new Set(flatRecords.map((r) => r.userId))];
    await parallel(uniqueUserIds, 50, (uid) =>
      prisma.kiroUser.upsert({
        where: { userId: uid },
        update: { syncedAt: new Date() },
        create: { userId: uid, displayName: uid.split(".").pop() ?? uid, syncedAt: new Date() },
      }),
    );

    // 메시지 배치 insert
    let dayInserted = 0;
    for (let i = 0; i < flatRecords.length; i += 500) {
      const batch = flatRecords.slice(i, i + 500);
      const result = await prisma.message.createMany({
        data: batch.map((rec) => ({
          requestId: rec.requestId,
          userId: rec.userId,
          conversationId: rec.conversationId,
          chatTriggerType: rec.chatTriggerType,
          modelId: rec.modelId,
          timestamp: new Date(rec.timestamp),
          date: rec.date,
          hour: rec.hour,
          promptLength: rec.promptLength,
          responseLength: rec.responseLength,
          s3Key: rec.s3Key,
        })),
        skipDuplicates: true,
      });
      dayInserted += result.count;
    }

    // 수집 로그
    await prisma.collectionLog.createMany({
      data: successKeys.map((key) => ({
        s3Key: key,
        collectedAt: new Date(),
        recordCount: results.find((r) => r.key === key)?.records.length ?? 0,
        fileType: "gar",
      })),
      skipDuplicates: true,
    });

    totalInserted += dayInserted;
    process.stdout.write(` ${dayInserted}건 저장 (누적: ${totalInserted})\n`);
  }

  return totalInserted;
}

async function backfillReports(from: Date, to: Date) {
  console.log("\n=== User Report 백필 ===");
  let totalInserted = 0;

  for (const day of dayRange(from, to)) {
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const dd = day.getUTCDate();
    const dateStr = day.toISOString().slice(0, 10);

    const prefix = buildReportPrefix(ACCOUNT_ID, REGION, year, month, dd);
    const allKeys = await listS3Keys(BUCKET, prefix);
    if (allKeys.length === 0) continue;

    const collected = await prisma.collectionLog.findMany({
      where: { s3Key: { in: allKeys } },
      select: { s3Key: true },
    });
    const collectedSet = new Set(collected.map((c) => c.s3Key));
    const newKeys = allKeys.filter((k) => !collectedSet.has(k));

    if (newKeys.length === 0) {
      process.stdout.write(`${dateStr}: 이미 수집됨\n`);
      continue;
    }

    process.stdout.write(`${dateStr}: ${newKeys.length}개 다운로드 중...`);

    const results = await parallel(newKeys, CONCURRENCY, async (key) => {
      try {
        const bytes = await getS3Object(BUCKET, key);
        return { key, records: parseReportFile(bytes, key) };
      } catch {
        return { key, records: [] as ReturnType<typeof parseReportFile> };
      }
    });

    const flatRecords = results.flatMap((r) => r.records);
    const successKeys = results.filter((r) => r.records.length > 0).map((r) => r.key);

    if (flatRecords.length === 0) {
      process.stdout.write(" 0건\n");
      continue;
    }

    // 사용자 + report upsert
    const uniqueUserIds = [...new Set(flatRecords.map((r) => r.userId))];
    await parallel(uniqueUserIds, 50, (uid) =>
      prisma.kiroUser.upsert({
        where: { userId: uid },
        update: { syncedAt: new Date() },
        create: { userId: uid, displayName: uid.split(".").pop() ?? uid, syncedAt: new Date() },
      }),
    );

    await parallel(flatRecords, 50, (rec) =>
      prisma.userReport.upsert({
        where: { date_userId: { date: rec.date, userId: rec.userId } },
        update: { creditsUsed: rec.creditsUsed, totalMessages: rec.totalMessages, subscriptionTier: rec.subscriptionTier, s3Key: rec.s3Key },
        create: { ...rec },
      }),
    );

    await prisma.collectionLog.createMany({
      data: successKeys.map((key) => ({
        s3Key: key, collectedAt: new Date(),
        recordCount: results.find((r) => r.key === key)?.records.length ?? 0, fileType: "report",
      })),
      skipDuplicates: true,
    });

    totalInserted += flatRecords.length;
    process.stdout.write(` ${flatRecords.length}건 (누적: ${totalInserted})\n`);
  }

  return totalInserted;
}

async function main() {
  const { from, to } = parseDateRange();

  const garCount = await backfillGar(from, to);
  const reportCount = await backfillReports(from, to);

  const totalMessages = await prisma.message.count();
  const totalUsers = await prisma.kiroUser.count();
  const totalReports = await prisma.userReport.count();

  console.log(`\n=== 백필 완료 ===`);
  console.log(`GAR: ${garCount}건 신규 저장`);
  console.log(`Report: ${reportCount}건 신규 저장`);
  console.log(`DB 현황: 메시지 ${totalMessages} / 사용자 ${totalUsers} / 리포트 ${totalReports}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("백필 실패:", err);
  process.exit(1);
});
