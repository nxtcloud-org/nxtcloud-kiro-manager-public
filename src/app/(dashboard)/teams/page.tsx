"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { useApi } from "@/hooks/use-api";

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

interface Course { groupId: string; code: string; name: string; orgName: string; memberCount: number; }
interface TeamStat { teamName: string; memberCount: number; activeCount: number; messages: number; }

export default function TeamsPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const { data: allCourses } = useApi<Course[]>("/api/teams/courses");
  // 팀이 있는 수업만 (memberCount > 0)
  const courses = allCourses?.filter((c) => c.memberCount > 0);
  const { data: stats, isLoading: statsLoading } = useApi<TeamStat[]>(
    selectedCourse ? `/api/teams/stats?course=${selectedCourse}&start=${start}&end=${end}` : null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">팀 분석</h1>
          <p className="text-muted-foreground">코스별 팀 활동 현황</p>
        </div>
        <DateRangePicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedCourse} onValueChange={(v) => setSelectedCourse(v ?? "")}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="코스를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {courses?.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.orgName} · {c.name} ({c.memberCount}명)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCourse ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            코스를 선택하면 팀별 통계가 표시됩니다
          </CardContent>
        </Card>
      ) : statsLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : !stats || stats.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            해당 코스에 등록된 팀이 없습니다
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {courses?.find((c) => c.code === selectedCourse)?.orgName} · {courses?.find((c) => c.code === selectedCourse)?.name} — 팀별 활동 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>팀</TableHead>
                  <TableHead className="text-right">인원</TableHead>
                  <TableHead className="text-right">활성</TableHead>
                  <TableHead className="text-right">메시지</TableHead>
                  <TableHead className="text-right">인당 평균</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((team) => (
                  <TableRow key={team.teamName}>
                    <TableCell className="font-medium">{team.teamName}</TableCell>
                    <TableCell className="text-right">{team.memberCount}</TableCell>
                    <TableCell className="text-right">{team.activeCount}</TableCell>
                    <TableCell className="text-right">{team.messages.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {team.memberCount > 0 ? Math.round(team.messages / team.memberCount) : 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
