"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

interface DailyData {
  date: string;
  messages: number;
  users: number;
}

export function DailyTrendChart({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const { data, isLoading } = useApi<DailyData[]>(
    `/api/usage/daily-active?start=${start}&end=${end}`,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">일별 사용 트렌드</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !data || data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            기간 내 데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(v) => `${v}`}
                formatter={(value, name) => [
                  Number(value).toLocaleString(),
                  name === "messages" ? "메시지" : "사용자",
                ]}
              />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.2}
                name="messages"
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.2}
                name="users"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
