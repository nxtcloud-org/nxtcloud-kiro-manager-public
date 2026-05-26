"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApi } from "@/hooks/use-api";
import { Info } from "lucide-react";

function Tip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex ml-1 cursor-help align-middle">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-56">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface Summary {
  totalMessages: number;
  activeUsers: number;
  totalUsers: number;
  utilizationRate: number;
  peakHour: number | null;
  peakHourCount: number;
}

function AnimatedValue({ value }: { value: number }) {
  if (value === 0) return <span>0</span>;
  return <NumberTicker value={value} />;
}

export function SummaryCards({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const { data, isLoading } = useApi<Summary>(
    `/api/dashboard/summary?start=${start}&end=${end}`,
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const dailyAvg = (() => {
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );
    return Math.round(data.totalMessages / days);
  })();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardDescription>총 메시지<Tip text="조회 기간 내 학생들이 KIRO IDE에서 AI와 나눈 대화 건수입니다." /></CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            <AnimatedValue value={data.totalMessages} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{start} ~ {end}</p>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardDescription>활성 사용자<Tip text="조회 기간 내 AI 대화를 1건 이상 사용한 학생 수 / 전체 등록 학생 수입니다." /></CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            <AnimatedValue value={data.activeUsers} />
            <span className="text-lg text-muted-foreground font-normal"> / {data.totalUsers}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            활용률 <span className="font-medium text-foreground">{data.utilizationRate}%</span>
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardDescription>피크 시간<Tip text="조회 기간 중 AI 대화가 가장 많이 발생한 시간대입니다 (KST 기준)." /></CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {data.peakHour !== null ? (
              <>
                <AnimatedValue value={data.peakHour} />
                <span className="text-lg font-normal">시</span>
              </>
            ) : (
              "-"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {data.peakHourCount > 0
              ? `${data.peakHourCount.toLocaleString()}건`
              : "데이터 없음"}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardDescription>일평균 메시지<Tip text="조회 기간의 총 메시지를 일수로 나눈 값입니다. 전체 사용 강도를 보여줍니다." /></CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            <AnimatedValue value={dailyAvg} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">건 / 일</p>
        </CardContent>
      </Card>
    </div>
  );
}
