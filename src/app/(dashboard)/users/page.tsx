"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { useApi } from "@/hooks/use-api";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

const PAGE_SIZE = 20;

interface CourseInfo { name: string; code: string; team: string | null; }

interface UserData {
  userId: string;
  displayName: string;
  email: string | null;
  userType: string | null;
  schoolCode: string | null;
  studentId: string | null;
  groups: string[];
  courses: CourseInfo[];
  messageCount: number;
  totalPromptChars: number;
  totalResponseChars: number;
}

export default function UsersPage() {
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useApi<UserData[]>(
    `/api/users/top?start=${start}&end=${end}&limit=500`,
  );

  // 필터링
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((user) => {
      if (search) {
        const q = search.toLowerCase();
        const match = user.displayName.toLowerCase().includes(q)
          || user.studentId?.includes(q)
          || user.email?.toLowerCase().includes(q)
          || user.courses.some((c) => c.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (schoolFilter !== "all" && user.schoolCode !== schoolFilter) return false;
      if (courseFilter !== "all") {
        const hasCourse = user.courses.some((c) => c.name === courseFilter) || user.groups.includes(courseFilter);
        if (!hasCourse) return false;
      }
      return true;
    });
  }, [data, search, schoolFilter, courseFilter]);

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // 필터 옵션 추출
  const schools = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((u) => u.schoolCode).filter(Boolean))] as string[];
  }, [data]);

  // 소속 선택 시 해당 소속 사용자의 과목만 표시
  const courses = useMemo(() => {
    if (!data) return [];
    const scoped = schoolFilter !== "all"
      ? data.filter((u) => u.schoolCode === schoolFilter)
      : data;
    const all = scoped.flatMap((u) => u.courses.map((c) => c.name));
    return [...new Set(all)].sort();
  }, [data, schoolFilter]);

  // 필터 변경 시 페이지 리셋
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleSchool = (v: string) => { setSchoolFilter(v); setCourseFilter("all"); setPage(0); };
  const handleCourse = (v: string) => { setCourseFilter(v); setPage(0); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">사용자</h1>
          <p className="text-muted-foreground">사용량 기준 사용자 목록</p>
        </div>
        <DateRangePicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 학번, 이메일, 과목 검색"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={schoolFilter} onValueChange={(v) => handleSchool(v ?? "all")}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="소속" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 소속</SelectItem>
            {schools.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {schoolFilter !== "all" && courses.length > 0 && (
          <Select value={courseFilter} onValueChange={(v) => handleCourse(v ?? "all")}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="수강 과목" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 과목</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(search || schoolFilter !== "all" || courseFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSchoolFilter("all"); setCourseFilter("all"); setPage(0); }}>
            초기화
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filtered.length === data?.length
                ? `전체 ${data?.length ?? 0}명`
                : `${filtered.length}명 / ${data?.length ?? 0}명`}
            </CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="tabular-nums">{page + 1} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : paged.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search || schoolFilter !== "all" || courseFilter !== "all"
                ? "검색 조건에 맞는 사용자가 없습니다"
                : "기간 내 활동한 사용자가 없습니다"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead className="hidden md:table-cell">소속</TableHead>
                  <TableHead>수강 과목</TableHead>
                  <TableHead className="text-right">메시지</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">프롬프트(자)</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">응답(자)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((user, i) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium tabular-nums">{page * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell>
                      <Link href={`/users/${encodeURIComponent(user.userId)}`} className="hover:underline">
                        <div className="font-medium">{user.displayName}</div>
                        {user.studentId && (
                          <div className="text-xs text-muted-foreground">{user.studentId}</div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {user.schoolCode ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.courses.length > 0
                          ? user.courses.map((c) => (
                              <Badge key={c.code} variant="secondary" className="text-xs">
                                {c.name}{c.team ? ` · ${c.team}` : ""}
                              </Badge>
                            ))
                          : user.groups.map((g) => (
                              <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                            ))
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{user.messageCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell tabular-nums">{user.totalPromptChars.toLocaleString()}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell tabular-nums">{user.totalResponseChars.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 하단 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                이전
              </Button>
              <span className="tabular-nums">{page + 1} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
