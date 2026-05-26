"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { Hi } from "@/components/ui/highlight";
import type {
  DailyUsageInsight,
  HourlyUsageInsight,
} from "@/services/usage-insight.service";

export function DailyInsight({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const { data, isLoading } = useApi<DailyUsageInsight>(
    `/api/usage/insights?type=daily&start=${start}&end=${end}`,
  );

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data || data.activeDays === 0) return null;

  const trendLabel = {
    up: "증가",
    down: "감소",
    stable: "유지",
  }[data.trend];
  const trendVariant = {
    up: "good" as const,
    down: "warn" as const,
    stable: "neutral" as const,
  }[data.trend];

  return (
    <Card>
      <CardContent className="py-4 space-y-3 text-[15px] leading-relaxed">
        <p>
          조회 기간 <Hi>{data.totalDays}일</Hi> 중{" "}
          <Hi>{data.activeDays}일</Hi>에 AI 대화가 발생했습니다.
          {data.busiestDay && (
            <>
              {" "}가장 활발했던 날은{" "}
              <Hi variant="good">
                {data.busiestDay.date} ({data.busiestDay.dayOfWeek})
              </Hi>
              로 <Hi>{data.busiestDay.messages.toLocaleString()}건</Hi>이
              기록되었습니다.
            </>
          )}
        </p>

        <p>
          평일 평균 <Hi>{data.weekdayAvg.toLocaleString()}건</Hi>, 주말 평균{" "}
          <Hi>{data.weekendAvg.toLocaleString()}건</Hi>으로
          {data.weekendAvg > 0 ? (
            <>
              {" "}주말 사용량은 평일 대비{" "}
              <Hi variant={parseInt(data.weekendRatio) > 50 ? "good" : "warn"}>
                {data.weekendRatio}
              </Hi>
              입니다.
              {parseInt(data.weekendRatio) > 70
                ? " 주말에도 활발히 활용하고 있습니다."
                : parseInt(data.weekendRatio) > 30
                  ? " 주말에는 사용이 다소 줄어듭니다."
                  : " 주말 사용은 거의 없어 수업 기반 활용으로 보입니다."}
            </>
          ) : (
            " 주말에는 사용이 없었습니다."
          )}
        </p>

        <p>
          기간 전반 대비 후반 사용량이{" "}
          <Hi variant={trendVariant}>
            {data.trendPct}% {trendLabel}
          </Hi>
          했습니다.
          {data.trend === "up" &&
            " 활용도가 높아지고 있어 긍정적인 추세입니다."}
          {data.trend === "down" &&
            " 사용량이 줄어들고 있어 활성화 방안을 검토할 수 있습니다."}
          {data.trend === "stable" && " 안정적인 사용 패턴을 보이고 있습니다."}
        </p>
      </CardContent>
    </Card>
  );
}

export function HourlyInsight({ date }: { date: string }) {
  const { data, isLoading } = useApi<HourlyUsageInsight>(
    `/api/usage/insights?type=hourly&date=${date}`,
  );

  if (isLoading) return <Skeleton className="h-28 w-full" />;
  if (!data || data.totalMessages === 0) return null;

  return (
    <Card>
      <CardContent className="py-4 space-y-3 text-[15px] leading-relaxed">
        <p>
          이 날 총 <Hi>{data.totalMessages.toLocaleString()}건</Hi>의 AI 대화가
          발생했으며, <Hi>{data.activeHours}개</Hi> 시간대에 걸쳐 분포되어
          있습니다.
        </p>

        <p>
          피크 시간대는{" "}
          <Hi variant="good">
            {data.peakHour}시 ~ {data.peakHour + 1}시
          </Hi>
          로, 전체의 <Hi>{data.peakShare}%</Hi>(
          {data.peakMessages.toLocaleString()}건)가 집중되었습니다.
        </p>

        <p>
          시간대별 분포: 오전(06~12시){" "}
          <Hi>{data.morningShare}%</Hi>, 오후(12~18시){" "}
          <Hi>{data.afternoonShare}%</Hi>, 저녁(18~22시){" "}
          <Hi>{data.eveningShare}%</Hi>, 야간(22~06시){" "}
          <Hi variant={data.nightShare > 15 ? "warn" : "neutral"}>
            {data.nightShare}%
          </Hi>
        </p>

        {data.nightShare > 0 && (
          <p className="text-muted-foreground">
            {data.nightShare > 20 ? (
              <>
                야간 사용이{" "}
                <Hi variant="warn">
                  {data.nightPeriodMessages.toLocaleString()}건({data.nightShare}
                  %)
                </Hi>
                으로 상당합니다. 학생들이 새벽에도 AI와 함께 코딩하고 있습니다.{" "}
                <strong>
                  24시간 언제든 옆에 있는 AI 조교 — 이것이 KIRO의 핵심
                  가치입니다.
                </strong>
              </>
            ) : data.nightShare > 5 ? (
              <>
                야간(22~06시)에도{" "}
                <Hi>{data.nightPeriodMessages.toLocaleString()}건</Hi>의 사용이
                있었습니다. 과제 마감 등 야간 학습 시에도 AI 도구가 활용되고
                있습니다.
              </>
            ) : (
              <>
                야간 사용은 {data.nightPeriodMessages}건으로 미미합니다. 주로
                수업 시간과 주간에 활용되고 있습니다.
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
