"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { useApi } from "@/hooks/use-api";
import { Hi } from "@/components/ui/highlight";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

interface GroupStat {
  groupCode: string;
  groupName: string;
  orgName: string;
  registered: number;
  active: number;
  messages: number;
  utilizationRate: number;
}

export default function GroupsPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());

  const { data, isLoading } = useApi<GroupStat[]>(
    `/api/groups/stats?start=${start}&end=${end}`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">그룹 관리</h1>
          <p className="text-muted-foreground">수업/과정별 사용 현황</p>
        </div>
        <DateRangePicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-20 w-full" /></CardHeader></Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            등록된 그룹이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((group) => (
            <Card key={group.groupCode}>
              <CardHeader className="pb-2">
                <Badge variant="secondary">{group.orgName}</Badge>
                <CardTitle className="text-lg">{group.groupName}</CardTitle>
                <CardDescription>{group.groupCode}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <AnimatedCircularProgressBar
                    max={100}
                    value={group.utilizationRate}
                    min={0}
                    gaugePrimaryColor={group.utilizationRate >= 70 ? "rgb(16 185 129)" : group.utilizationRate >= 40 ? "rgb(245 158 11)" : "rgb(239 68 68)"}
                    gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
                    className="size-20 shrink-0"
                  />
                  <div className="grid grid-cols-3 gap-2 flex-1 text-center text-sm">
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{group.registered}</p>
                      <p className="text-xs text-muted-foreground">등록</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{group.active}</p>
                      <p className="text-xs text-muted-foreground">활성</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{group.messages.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">메시지</p>
                    </div>
                  </div>
                </div>
                {/* 그룹 요약 */}
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  {group.registered > 0 ? (
                    <>
                      등록 {group.registered}명 중{" "}
                      <Hi variant={group.utilizationRate >= 70 ? "good" : group.utilizationRate >= 40 ? "warn" : "bad"}>
                        {group.active}명({group.utilizationRate}%)
                      </Hi>
                      이 활용 중.
                      {group.active > 0 && (
                        <> 인당 평균 <Hi>{Math.round(group.messages / group.active)}건</Hi>.</>
                      )}
                      {group.utilizationRate < 40 && " 활용 가이드 보강이 필요합니다."}
                      {group.utilizationRate >= 70 && " 활발히 활용되고 있습니다."}
                    </>
                  ) : (
                    "등록된 사용자가 없습니다."
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
