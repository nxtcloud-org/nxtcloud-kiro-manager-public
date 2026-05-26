"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { Hi } from "@/components/ui/highlight";

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

export function HeadlineBanner({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useApi<Report>(`/api/report?start=${start}&end=${end}`);
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!data) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4 text-center">
        <p className="text-lg leading-relaxed">
          등록 학생 <Hi>{data.headline.registeredStudents}명</Hi> 중{" "}
          <Hi variant={data.headline.utilizationRate >= 70 ? "good" : data.headline.utilizationRate >= 40 ? "warn" : "bad"}>
            {data.headline.activeStudents}명({data.headline.utilizationRate}%)
          </Hi>이 AI 도구를 실제 사용.{" "}
          활용 학생은 하루 평균 <Hi>{data.headline.avgDailyPerUser}회</Hi> AI와 대화.
        </p>
      </CardContent>
    </Card>
  );
}

export function CourseComparison({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useApi<Report>(`/api/report?start=${start}&end=${end}`);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.courseBreakdown.length === 0) return null;

  return (
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
  );
}

export function TopStudents({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useApi<Report>(`/api/report?start=${start}&end=${end}`);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.topStudents.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">가장 적극적인 학생 TOP 10</CardTitle>
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
  );
}
