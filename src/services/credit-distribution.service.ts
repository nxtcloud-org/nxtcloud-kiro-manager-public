import { prisma } from "@/lib/prisma";
import { CREDIT_LIMITS } from "@/lib/constants";

interface DistributionParams {
  groupCodes?: string[];
}

interface UserCreditBucket {
  userId: string;
  displayName: string;
  schoolCode: string | null;
  creditsUsed: number;
  creditLimit: number;
  usageRate: number;
  projectedRate: number;
  bucket: "critical" | "active" | "low" | "inactive";
}

export interface CreditDistribution {
  month: {
    label: string;           // "2026년 4월"
    startDate: string;       // "2026-04-01"
    endDate: string;         // "2026-04-30"
    today: string;           // "2026-04-03"
    daysPassed: number;      // 3
    daysTotal: number;       // 30
    progressPct: number;     // 10
  };
  buckets: {
    critical: UserCreditBucket[];
    active: UserCreditBucket[];
    low: UserCreditBucket[];
    inactive: UserCreditBucket[];
  };
  summary: {
    total: number;
    criticalCount: number;
    activeCount: number;
    lowCount: number;
    inactiveCount: number;
    avgUsageRate: number;
    avgProjectedRate: number;
    overPaceCount: number;   // 현재 페이스면 월말 100% 초과 예상 인원
  };
}

export async function getCreditDistribution({
  groupCodes,
}: DistributionParams): Promise<CreditDistribution> {
  // 당월 기준 계산
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);

  const startDate = firstDay.toISOString().slice(0, 10);
  const endDate = lastDay.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const daysPassed = Math.max(1, now.getDate());
  const daysTotal = lastDay.getDate();
  const progressPct = Math.round((daysPassed / daysTotal) * 100);

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const label = `${year}년 ${monthNames[monthIdx]}`;

  const userFilter = groupCodes?.length
    ? { kiroUser: { userGroups: { some: { group: { code: { in: groupCodes } } } } } }
    : {};

  // 전체 학생 목록 (Report 없는 학생도 포함)
  const groupFilter = groupCodes?.length
    ? { userGroups: { some: { group: { code: { in: groupCodes } } } } }
    : {};

  const allStudents = await prisma.kiroUser.findMany({
    where: { userType: "student", ...groupFilter },
    select: { userId: true, displayName: true, schoolCode: true },
  });

  // 당월 Report 합산
  const reportFilter = groupCodes?.length
    ? { kiroUser: { userGroups: { some: { group: { code: { in: groupCodes } } } } } }
    : {};

  const reports = await prisma.userReport.findMany({
    where: { date: { gte: startDate, lte: today }, ...reportFilter },
    select: { userId: true, creditsUsed: true, subscriptionTier: true },
  });

  const byUser = new Map<string, { creditsUsed: number; tier: string }>();
  for (const r of reports) {
    const existing = byUser.get(r.userId);
    byUser.set(r.userId, {
      creditsUsed: (existing?.creditsUsed ?? 0) + r.creditsUsed,
      tier: r.subscriptionTier ?? existing?.tier ?? "PRO",
    });
  }

  // (allStudents에서 직접 참조)

  const buckets: CreditDistribution["buckets"] = {
    critical: [],
    active: [],
    low: [],
    inactive: [],
  };

  let totalUsageRate = 0;
  let totalProjectedRate = 0;
  let overPaceCount = 0;

  // 전체 학생을 순회 (Report 있으면 합산, 없으면 0)
  for (const student of allStudents) {
    const data = byUser.get(student.userId);
    const creditsUsed = data?.creditsUsed ?? 0;
    const tier = data?.tier ?? "PRO";
    const creditLimit = CREDIT_LIMITS[tier] ?? CREDIT_LIMITS.PRO;
    const usageRate = creditLimit > 0 ? Math.round((creditsUsed / creditLimit) * 100) : 0;

    const dailyAvg = creditsUsed / daysPassed;
    const projected = dailyAvg * daysTotal;
    const projectedRate = creditLimit > 0 ? Math.round((projected / creditLimit) * 100) : 0;

    if (projectedRate > 100) overPaceCount++;

    const entry: UserCreditBucket = {
      userId: student.userId,
      displayName: student.displayName,
      schoolCode: student.schoolCode,
      creditsUsed: Math.round(creditsUsed * 10) / 10,
      creditLimit,
      usageRate,
      projectedRate,
      bucket: usageRate >= 90 ? "critical" : usageRate >= 50 ? "active" : usageRate >= 10 ? "low" : "inactive",
    };

    buckets[entry.bucket].push(entry);
    totalUsageRate += usageRate;
    totalProjectedRate += projectedRate;
  }

  for (const key of Object.keys(buckets) as (keyof typeof buckets)[]) {
    buckets[key].sort((a, b) => b.usageRate - a.usageRate);
  }

  const total = allStudents.length;

  return {
    month: { label, startDate, endDate, today, daysPassed, daysTotal, progressPct },
    buckets,
    summary: {
      total,
      criticalCount: buckets.critical.length,
      activeCount: buckets.active.length,
      lowCount: buckets.low.length,
      inactiveCount: buckets.inactive.length,
      avgUsageRate: total > 0 ? Math.round(totalUsageRate / total) : 0,
      avgProjectedRate: total > 0 ? Math.round(totalProjectedRate / total) : 0,
      overPaceCount,
    },
  };
}
