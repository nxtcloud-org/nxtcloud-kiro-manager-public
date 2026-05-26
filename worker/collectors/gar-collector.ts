import { PrismaClient } from "@prisma/client";
import { listS3Keys, getS3Object, buildGarPrefix } from "../../src/lib/s3";
import { parseGarFile, type GarRecord } from "../parsers/gar-parser";

const CONCURRENCY = 20; // 동시 S3 다운로드 수

async function processInParallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function collectGarLogs(
  prisma: PrismaClient,
  bucket: string,
  accountId: string,
  region: string,
): Promise<number> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  let totalInserted = 0;

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - dayOffset);
    const day = d.getUTCDate();

    const prefix = buildGarPrefix(accountId, region, year, month, day);
    const allKeys = await listS3Keys(bucket, prefix);

    // 이미 수집된 키 제외
    const collected = await prisma.collectionLog.findMany({
      where: { s3Key: { in: allKeys } },
      select: { s3Key: true },
    });
    const collectedSet = new Set(collected.map((c) => c.s3Key));
    const newKeys = allKeys.filter((k) => !collectedSet.has(k));

    if (newKeys.length === 0) continue;
    console.log(`[GAR] ${prefix}: ${newKeys.length}개 새 파일 발견`);

    // 병렬 다운로드 + 파싱
    const allRecords = await processInParallel(newKeys, CONCURRENCY, async (key) => {
      try {
        const bytes = await getS3Object(bucket, key);
        const records = parseGarFile(bytes, key);
        return { key, records };
      } catch (err) {
        console.error(`[GAR] ${key} 다운로드 실패:`, err);
        return { key, records: [] as GarRecord[] };
      }
    });

    // 전체 레코드를 모아서 배치 처리
    const flatRecords = allRecords.flatMap((r) => r.records);
    const successKeys = allRecords.filter((r) => r.records.length > 0).map((r) => r.key);

    if (flatRecords.length === 0) continue;
    console.log(`[GAR] ${flatRecords.length}건 파싱 완료, DB 저장 시작...`);

    // 사용자 배치 upsert
    const uniqueUserIds = [...new Set(flatRecords.map((r) => r.userId))];
    for (let i = 0; i < uniqueUserIds.length; i += 100) {
      const batch = uniqueUserIds.slice(i, i + 100);
      await Promise.all(
        batch.map((uid) =>
          prisma.kiroUser.upsert({
            where: { userId: uid },
            update: { syncedAt: new Date() },
            create: {
              userId: uid,
              displayName: uid.split(".").pop() ?? uid,
              syncedAt: new Date(),
            },
          }),
        ),
      );
    }

    // 메시지 배치 insert (skipDuplicates)
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
      totalInserted += result.count;
    }

    // 수집 로그 배치 기록
    await prisma.collectionLog.createMany({
      data: successKeys.map((key) => ({
        s3Key: key,
        collectedAt: new Date(),
        recordCount: allRecords.find((r) => r.key === key)?.records.length ?? 0,
        fileType: "gar",
      })),
      skipDuplicates: true,
    });

    console.log(`[GAR] ${totalInserted}건 저장 완료`);
  }

  return totalInserted;
}
