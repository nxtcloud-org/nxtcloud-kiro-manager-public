"use client";

import { useState } from "react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { InsightCards } from "@/components/dashboard/insights";
import { HeadlineBanner, CourseComparison, TopStudents } from "@/components/dashboard/report-sections";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { HourlyChart } from "@/components/dashboard/hourly-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">
            KIRO IDE 도입 성과 및 사용 현황
          </p>
        </div>
        <DateRangePicker
          start={start}
          end={end}
          onStartChange={setStart}
          onEndChange={setEnd}
        />
      </div>

      <HeadlineBanner start={start} end={end} />

      <SummaryCards start={start} end={end} />

      <InsightCards start={start} end={end} />

      <CourseComparison start={start} end={end} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyTrendChart start={start} end={end} />
        <HourlyChart date={end} />
      </div>

      <TopStudents start={start} end={end} />
    </div>
  );
}
