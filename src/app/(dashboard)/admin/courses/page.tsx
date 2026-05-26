"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

interface CourseItem {
  id: string;
  code: string;
  name: string;
  semester: string;
  legacyGroupCode: string | null;
  organization: { name: string; code: string };
  _count: { enrollments: number };
}

interface Org { id: string; name: string; code: string }

export default function AdminCoursesPage() {
  const { data: courses, isLoading, mutate } = useApi<CourseItem[]>("/api/admin/courses");
  const { data: orgs } = useApi<Org[]>("/api/organizations");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", semester: "2026-1", organizationId: "", legacyGroupCode: "" });

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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 수업을 삭제하시겠습니까? 수강 등록 데이터가 모두 삭제됩니다.`)) return;
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">수업 관리</h1>
          <p className="text-muted-foreground">수업 생성, 수강 등록 관리</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer">
            <Plus className="h-4 w-4" />수업 생성
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>새 수업 생성</DialogTitle></DialogHeader>
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
                <Label>이름</Label>
                <Input placeholder="클라우드컴퓨팅" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>레거시 그룹 코드 (선택)</Label>
                <Input placeholder="a-univ-cloud" value={form.legacyGroupCode} onChange={(e) => setForm({ ...form, legacyGroupCode: e.target.value })} />
              </div>
              <Button onClick={handleCreate} disabled={!form.code || !form.name || !form.organizationId} className="w-full">생성</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {courses?.map((course) => (
            <Card key={course.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{course.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {course.organization.name} · {course.semester} · <code className="text-xs">{course.code}</code>
                    {course.legacyGroupCode && <> · 그룹: <code className="text-xs">{course.legacyGroupCode}</code></>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{course._count.enrollments}명</Badge>
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id, course.name)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
