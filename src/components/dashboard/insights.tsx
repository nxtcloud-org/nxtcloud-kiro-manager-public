"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Hi } from "@/components/ui/highlight";
import { useApi } from "@/hooks/use-api";
import type { Insights } from "@/services/insight.service";

export function InsightCards({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const { data, isLoading } = useApi<Insights>(
    `/api/dashboard/insights?start=${start}&end=${end}`,
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <UsageInsightCard usage={data.usage} />
      <CourseInsightCard courses={data.courses} />
      <CreditInsightCard credits={data.credits} />
    </div>
  );
}


function UsageInsightCard({ usage }: { usage: Insights["usage"] }) {
  const rateVariant = usage.utilizationRate >= 70 ? "good" as const : usage.utilizationRate >= 40 ? "warn" as const : "bad" as const;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">활용 요약</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-[15px] leading-relaxed">
        <p>
          전체 등록 학생 <Hi>{usage.totalUsers}명</Hi> 중{" "}
          <Hi variant={rateVariant}>{usage.activeUsers}명({usage.utilizationRate}%)</Hi>이
          조회 기간 내 KIRO를 실제 사용했습니다.
        </p>
        {usage.activeUsers > 0 && (
          <p>
            사용 학생 기준 1인당 하루 평균{" "}
            <Hi>{usage.avgDailyPerUser}회</Hi> AI 대화를 활용하고 있습니다.
          </p>
        )}
        {usage.inactiveUsers > 0 && (
          <p className="text-muted-foreground">
            비활성 학생 <Hi variant="warn">{usage.inactiveUsers}명</Hi>에 대한 활성화 안내를 검토할 수 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CourseInsightCard({ courses }: { courses: Insights["courses"] }) {
  if (courses.totalCourses === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">수업별 하이라이트</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          등록된 수업 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">수업별 하이라이트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-[15px] leading-relaxed">
        {courses.topCourse && (
          <p>
            가장 활발한 수업은 <Hi variant="good">{courses.topCourse.name}</Hi>으로,
            전체 메시지의 <Hi>{courses.topCourse.share}%</Hi>를 차지합니다.
          </p>
        )}
        {courses.bottomCourse && (
          <p>
            가장 저조한 수업은 <Hi variant={courses.bottomCourse.utilizationRate < 50 ? "warn" : "neutral"}>{courses.bottomCourse.name}</Hi>으로,
            활용률이 <Hi variant={courses.bottomCourse.utilizationRate < 50 ? "warn" : "neutral"}>{courses.bottomCourse.utilizationRate}%</Hi>에 그칩니다.
          </p>
        )}
        {courses.gapRatio > 1 && (
          <p className="text-muted-foreground">
            수업 간 격차가 <Hi variant={courses.gapRatio > 3 ? "bad" : "neutral"}>{courses.gapRatio}배</Hi>로,
            {courses.gapRatio > 3 ? " 활용 가이드 보강이 필요한 수업이 있습니다." : " 비교적 균등한 활용을 보이고 있습니다."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CreditInsightCard({ credits }: { credits: Insights["credits"] }) {
  if (credits.reportCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">크레딧 현황</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          크레딧 데이터가 아직 수집되지 않았습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">크레딧 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-[15px] leading-relaxed">
        <p>
          조회 기간 내 총 <Hi>{credits.totalCredits.toLocaleString()}</Hi> 크레딧이 사용되었습니다.
          사용자당 평균 <Hi>{credits.avgPerUser}</Hi> 크레딧입니다.
        </p>
        {credits.concentrationRatio > 1.5 && (
          <p>
            상위 10%가 평균의 <Hi variant="warn">{credits.concentrationRatio}배</Hi>를 사용하고 있어,
            소수의 적극 활용자가 크레딧 소비를 주도하고 있습니다.
          </p>
        )}
        {credits.concentrationRatio <= 1.5 && credits.concentrationRatio > 0 && (
          <p className="text-muted-foreground">
            크레딧 사용이 <Hi variant="good">균등</Hi>하게 분포되어 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
