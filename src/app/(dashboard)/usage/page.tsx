"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { HourlyChart } from "@/components/dashboard/hourly-chart";
import { DailyInsight, HourlyInsight } from "@/components/dashboard/usage-insights";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function UsagePage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [selectedDate, setSelectedDate] = useState(today());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">사용량 분석</h1>
        <p className="text-muted-foreground">
          일별, 시간별 KIRO IDE 사용 패턴을 분석합니다
        </p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">일별 추이</TabsTrigger>
          <TabsTrigger value="hourly">시간대별</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <DateRangePicker
            start={start}
            end={end}
            onStartChange={setStart}
            onEndChange={setEnd}
          />
          <DailyInsight start={start} end={end} />
          <DailyTrendChart start={start} end={end} />
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="hourly-date" className="text-xs">
              날짜 선택
            </Label>
            <Input
              id="hourly-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>
          <HourlyInsight date={selectedDate} />
          <HourlyChart date={selectedDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
