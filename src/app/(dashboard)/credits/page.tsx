"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { useApi } from "@/hooks/use-api";
import { Hi } from "@/components/ui/highlight";

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

interface Report {
  period: { start: string; end: string; days: number };
  headline: {
    registeredStudents: number;
    activeStudents: number;
    utilizationRate: number;
    totalMessages: number;
    avgDailyPerUser: number;
  };
  courseBreakdown: {
    name: string;
    registered: number;
    active: number;
    utilizationRate: number;
    messages: number;
    avgPerUser: number;
  }[];
  engagement: {
    heavyUsers: number;
    regularUsers: number;
    lightUsers: number;
    neverUsed: number;
  };
  timePattern: {
    weekdayShare: number;
    weekendShare: number;
    nightShare: number;
    peakHour: number;
  };
  topStudents: {
    displayName: string;
    schoolCode: string | null;
    messages: number;
    courses: string[];
  }[];
}

export default function ReportPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());

  const { data, isLoading } = useApi<Report>(
    `/api/report?start=${start}&end=${end}`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">활용 리포트</h1>
          <p className="text-muted-foreground">경영진 보고용 AI 도구 도입 성과 요약</p>
        </div>
        <DateRangePicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !data ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">데이터 없음</CardContent></Card>
      ) : (
        <>
          {/* 핵심 한줄 요약 */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-5 text-center">
              <p className="text-lg leading-relaxed">
                등록 학생 <Hi>{data.headline.registeredStudents}명</Hi> 중{" "}
                <Hi variant={data.headline.utilizationRate >= 70 ? "good" : data.headline.utilizationRate >= 40 ? "warn" : "bad"}>
                  {data.headline.activeStudents}명({data.headline.utilizationRate}%)
                </Hi>이 AI 도구를 실제 사용.{" "}
                활용 학생은 하루 평균 <Hi>{data.headline.avgDailyPerUser}회</Hi> AI와 대화.
              </p>
            </CardContent>
          </Card>

          {/* 상세 인사이트 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">도입 성과 요약</CardTitle>
              <CardDescription>{data.period.start} ~ {data.period.end} ({data.period.days}일)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-[15px] leading-relaxed">
              <p>
                조회 기간 동안 총 <Hi>{data.headline.totalMessages.toLocaleString()}건</Hi>의 AI 대화가 발생했습니다.
                {data.headline.activeStudents > 0 && (
                  <> 사용 학생 1인당 평균 <Hi>{Math.round(data.headline.totalMessages / data.headline.activeStudents)}건</Hi>의 대화를 나눴습니다.</>
                )}
              </p>

              <p>
                사용 강도별 분포:{" "}
                <Hi variant="good">적극 활용(100건+) {data.engagement.heavyUsers}명</Hi>,{" "}
                <Hi>일반 활용(10~100건) {data.engagement.regularUsers}명</Hi>,{" "}
                가벼운 사용(~10건) {data.engagement.lightUsers}명
                {data.engagement.neverUsed > 0 && (
                  <>, <Hi variant="warn">미사용 {data.engagement.neverUsed}명</Hi></>
                )}
              </p>

              <p>
                사용 시간대: 평일 <Hi>{data.timePattern.weekdayShare}%</Hi>, 주말 <Hi>{data.timePattern.weekendShare}%</Hi>.
                피크는 <Hi>{data.timePattern.peakHour}시</Hi>.
                {data.timePattern.nightShare > 0 && (
                  <> 야간(22~06시) 사용 <Hi variant={data.timePattern.nightShare > 15 ? "warn" : "neutral"}>{data.timePattern.nightShare}%</Hi>
                    {data.timePattern.nightShare > 10 && " — 학생들이 새벽에도 AI와 함께 학습하고 있습니다."}
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {/* 수업별 비교 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수업별 활용 비교</CardTitle>
              <CardDescription>어떤 수업에서 AI 도구가 효과적으로 쓰이고 있는가</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>수업</TableHead>
                    <TableHead className="text-right">등록</TableHead>
                    <TableHead className="text-right">활성</TableHead>
                    <TableHead className="text-right">활용률</TableHead>
                    <TableHead className="text-right">메시지</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">인당 평균</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.courseBreakdown.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.registered}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.active}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.utilizationRate >= 70 ? "default" : c.utilizationRate >= 40 ? "secondary" : "outline"} className="tabular-nums">
                          {c.utilizationRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.messages.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">{c.avgPerUser}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* TOP 10 학생 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">가장 적극적인 학생 TOP 10</CardTitle>
              <CardDescription>AI 도구를 가장 활발히 활용하는 학생</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead className="hidden sm:table-cell">소속</TableHead>
                    <TableHead className="hidden sm:table-cell">수강 과목</TableHead>
                    <TableHead className="text-right">메시지</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topStudents.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.displayName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{s.schoolCode ?? "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {s.courses.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{s.messages.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
