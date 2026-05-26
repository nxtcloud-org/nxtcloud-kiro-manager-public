"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

interface HourlyData {
  hour: number;
  messages: number;
}

export function HourlyChart({ date }: { date: string }) {
  const { data, isLoading } = useApi<HourlyData[]>(
    `/api/usage/hourly-active?date=${date}`,
  );

  const hasData = data?.some((d) => d.messages > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          시간대별 분포 ({date})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            해당 날짜 데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}시`}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(v) => `${v}시 (KST)`}
                formatter={(value) => [
                  Number(value).toLocaleString(),
                  "메시지",
                ]}
              />
              <Bar
                dataKey="messages"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
