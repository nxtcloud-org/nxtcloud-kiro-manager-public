"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { Plus, Users, Trash2, X, Layers } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

interface CourseItem {
  id: string;
  code: string;
  name: string;
  semester: string;
  legacyGroupCode: string | null;
  organizationId: string;
  organization: { name: string; code: string };
  _count: { enrollments: number };
  overlapCount: number;
  uniqueCount: number;
}

interface Enrollment {
  id: string;
  userId: string;
  teamName: string | null;
  kiroUser: {
    userId: string;
    displayName: string;
    email: string | null;
    schoolCode: string | null;
    studentId: string | null;
  };
  otherGroups?: string[];
}

interface KiroUserSearch {
  userId: string;
  displayName: string;
  email: string | null;
  schoolCode: string | null;
  studentId: string | null;
}

interface Org { id: string; name: string; code: string }

export default function AdminGroupsPage() {
  const { data: courses, isLoading, mutate } = useApi<CourseItem[]>("/api/admin/courses");
  const { data: orgs } = useApi<Org[]>("/api/organizations");

  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", semester: "2026-1", organizationId: "", legacyGroupCode: "" });

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KiroUserSearch[]>([]);

  const orgOptions = useMemo(() => {
    if (!courses) return [];
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.organization.code, c.organization.name));
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  }, [courses]);

  const filtered = useMemo(() => {
    if (!courses) return [];
    if (orgFilter === "all") return courses;
    return courses.filter((c) => c.organization.code === orgFilter);
  }, [courses, orgFilter]);

  async function handleCreate() {
    const body = { ...form, legacyGroupCode: form.legacyGroupCode || undefined };
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setCreating(false);
      setForm({ code: "", name: "", semester: "2026-1", organizationId: "", legacyGroupCode: "" });
      mutate();
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`"${name}" 그룹을 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    if (selectedCourse?.id === id) { setSelectedCourse(null); setEnrollments([]); }
    mutate();
  }

  const loadEnrollments = useCallback(async (course: CourseItem) => {
    setSelectedCourse(course);
    setLoadingMembers(true);
    setSearchQuery("");
    setSearchResults([]);

    const res = await fetch(`/api/admin/courses/${course.id}/enrollments`);
    if (!res.ok) { setLoadingMembers(false); return; }
    const data: Enrollment[] = await res.json();

    // 다른 그룹 소속 정보
    const allCourses = courses ?? [];
    const otherCourseIds = allCourses.filter((c) => c.id !== course.id).map((c) => c.id);

    if (otherCourseIds.length > 0) {
      const otherEnrollments = await Promise.all(
        otherCourseIds.map(async (cid) => {
          const r = await fetch(`/api/admin/courses/${cid}/enrollments`);
          if (!r.ok) return [];
          const enrolls: Enrollment[] = await r.json();
          const courseName = allCourses.find((c) => c.id === cid)?.name ?? cid;
          return enrolls.map((en) => ({ userId: en.userId, courseName }));
        })
      );
      const userOtherGroups = new Map<string, string[]>();
      otherEnrollments.flat().forEach(({ userId, courseName }) => {
        const list = userOtherGroups.get(userId) ?? [];
        list.push(courseName);
        userOtherGroups.set(userId, list);
      });
      data.forEach((en) => { en.otherGroups = userOtherGroups.get(en.userId) ?? []; });
    }

    setEnrollments(data);
    setLoadingMembers(false);
  }, [courses]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    const res = await fetch(`/api/users/top?limit=100&start=2020-01-01&end=2030-12-31`);
    if (!res.ok) return;
    const users: KiroUserSearch[] = await res.json();
    const q = searchQuery.toLowerCase();
    const results = users.filter((u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.studentId?.includes(q)
    );
    const enrolledIds = new Set(enrollments.map((en) => en.userId));
    setSearchResults(results.filter((u) => !enrolledIds.has(u.userId)));
  }

  async function handleAddMember(userId: string) {
    if (!selectedCourse) return;
    await fetch(`/api/admin/courses/${selectedCourse.id}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    loadEnrollments(selectedCourse);
    mutate();
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedCourse) return;
    await fetch(`/api/admin/courses/${selectedCourse.id}/enrollments?userId=${userId}`, { method: "DELETE" });
    loadEnrollments(selectedCourse);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">그룹 관리</h1>
          <p className="text-muted-foreground">IC 사용자를 그룹으로 묶어 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={orgFilter} onValueChange={(v) => v && setOrgFilter(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="학교 필터" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학교</SelectItem>
              {orgOptions.map((o) => <SelectItem key={o.code} value={o.code}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer">
              <Plus className="h-4 w-4" />그룹 생성
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>새 그룹 생성</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>조직</Label>
                  <Select value={form.organizationId} onValueChange={(v) => v && setForm({ ...form, organizationId: v })}>
                    <SelectTrigger><SelectValue placeholder="조직 선택" /></SelectTrigger>
                    <SelectContent>
                      {orgs?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>코드</Label>
                    <Input placeholder="cloud-2026-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>학기</Label>
                    <Input placeholder="2026-1" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>그룹명</Label>
                  <Input placeholder="클라우드컴퓨팅" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>IC 그룹 코드 (선택)</Label>
                  <Input placeholder="a-univ-cloud" value={form.legacyGroupCode} onChange={(e) => setForm({ ...form, legacyGroupCode: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground">IC 그룹과 연결하면 사용량 데이터가 이 그룹에 매핑됩니다</p>
                </div>
                <Button onClick={handleCreate} disabled={!form.code || !form.name || !form.organizationId} className="w-full">생성</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* 왼쪽: 그룹 목록 */}
        <div className="space-y-2">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">그룹이 없습니다</CardContent></Card>
          ) : filtered.map((course) => (
            <Card
              key={course.id}
              className={`cursor-pointer transition-colors ${selectedCourse?.id === course.id ? "border-primary bg-accent/50" : "hover:border-primary/30"}`}
              onClick={() => loadEnrollments(course)}
            >
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{course.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.organization.name} · {course.semester}
                    {course.legacyGroupCode && <span className="text-muted-foreground/50 ml-1">({course.legacyGroupCode})</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" />{course._count.enrollments}명</Badge>
                  {course.overlapCount > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Layers className="h-2.5 w-2.5" />{course.overlapCount}명 중복
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleDelete(e, course.id, course.name)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 오른쪽: 멤버 관리 */}
        <Card className="h-fit">
          {!selectedCourse ? (
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              왼쪽에서 그룹을 선택하세요
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selectedCourse.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedCourse.organization.name} · {selectedCourse.semester}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 사용자 검색 + 추가 */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">사용자 추가</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="이름, 이메일, 학번으로 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-8 text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={handleSearch}>검색</Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div key={user.userId} className="flex items-center justify-between px-3 py-1.5 text-sm">
                          <div>
                            <span className="font-medium text-xs">{user.displayName}</span>
                            {user.studentId && <span className="text-[11px] text-muted-foreground ml-1.5">{user.studentId}</span>}
                          </div>
                          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => handleAddMember(user.userId)}>추가</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* 현재 멤버 목록 */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">멤버 ({enrollments.length}명)</Label>
                  {loadingMembers ? (
                    <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  ) : enrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">멤버가 없습니다</p>
                  ) : (
                    <div className="border rounded-md divide-y max-h-[480px] overflow-y-auto">
                      {enrollments.map((e) => (
                        <div key={e.id} className="flex items-center justify-between px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium">{e.kiroUser.displayName}</span>
                              {e.kiroUser.studentId && <span className="text-xs text-muted-foreground">{e.kiroUser.studentId}</span>}
                              {e.otherGroups && e.otherGroups.length > 0 && (
                                <Badge variant="outline" className="text-[10px] gap-0.5 h-4 shrink-0">
                                  <Layers className="h-2.5 w-2.5" />
                                  {e.otherGroups.join(", ")}
                                </Badge>
                              )}
                            </div>
                            {e.kiroUser.email && <p className="text-[11px] text-muted-foreground truncate">{e.kiroUser.email}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveMember(e.userId)}>
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
