"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Hi } from "@/components/ui/highlight";
import { useApi } from "@/hooks/use-api";

interface Report {
  id: string;
  weekStart: string;
  weekEnd: string;
  messageCount: number;
  categories: Record<string, number>;
  keywords: string[];
  insights: string;
}

export function WeeklyReportSection() {
  const { data, isLoading } = useApi<Report[]>("/api/weekly-report");

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.length === 0) return null;

  const latest = data[0];
  const totalClassified = Object.values(latest.categories).reduce((s, c) => s + c, 0);

  // 카테고리를 비율 내림차순 정렬
  const sortedCats = Object.entries(latest.categories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({
      cat,
      count,
      pct: totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0,
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">주간 프롬프트 인사이트</CardTitle>
            <CardDescription>{latest.weekStart} ~ {latest.weekEnd} · {latest.messageCount}건 분석</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">Bedrock AI 분석</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 카테고리 분포 */}
        <div>
          <p className="text-sm font-medium mb-2">활용 카테고리</p>
          <div className="flex flex-wrap gap-2">
            {sortedCats.map(({ cat, pct }) => (
              <Badge
                key={cat}
                variant={pct >= 20 ? "default" : pct >= 10 ? "secondary" : "outline"}
                className="text-xs tabular-nums"
              >
                {cat} {pct}%
              </Badge>
            ))}
          </div>
        </div>

        {/* 키워드 */}
        <div>
          <p className="text-sm font-medium mb-2">주요 기술 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {(latest.keywords as string[]).slice(0, 12).map((kw) => (
              <span key={kw} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* AI 인사이트 */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">AI 분석 인사이트</p>
          <div className="text-[14px] leading-relaxed text-muted-foreground space-y-2">
            {latest.insights.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
