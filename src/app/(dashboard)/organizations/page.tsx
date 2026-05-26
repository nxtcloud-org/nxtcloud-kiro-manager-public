"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/hooks/use-api";
import { Building2, Users, BookOpen, CreditCard, Calendar, Cloud } from "lucide-react";

interface Sub {
  tier: string;
  seatCount: number;
  creditLimit: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  awsAccountId: string | null;
  awsAccountAlias: string | null;
}

interface Org {
  id: string;
  name: string;
  code: string;
  _count: { groups: number; courses: number };
  subscriptions: Sub[];
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function OrganizationsPage() {
  const { data, isLoading, mutate } = useApi<Org[]>("/api/organizations");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);

  async function handleCreate() {
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });
    if (res.ok) {
      setName("");
      setCode("");
      setOpen(false);
      mutate();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">조직 및 구독 관리</h1>
          <p className="text-muted-foreground">대학/기관과 구독 현황을 관리합니다</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            조직 추가
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>새 조직 등록</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>이름</Label>
                <Input placeholder="예: A 대학교" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>코드</Label>
                <Input placeholder="예: a-univ (영문소문자)" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full">등록</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">등록된 조직이 없습니다</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.map((org) => {
            const sub = org.subscriptions[0];
            return (
              <Card key={org.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{org.name}</CardTitle>
                    {sub && (
                      <Badge variant={sub.isActive ? "default" : "destructive"}>
                        {sub.isActive ? "활성" : "만료"}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{org.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sub ? (
                    <>
                      <InfoRow icon={CreditCard} label="구독 티어" value={<Badge variant="secondary">{sub.tier}</Badge>} />
                      <InfoRow icon={Users} label="좌석" value={`${sub.seatCount}석`} />
                      <InfoRow icon={CreditCard} label="크레딧 한도" value={`${sub.creditLimit} / 월`} />
                      <InfoRow icon={Calendar} label="기간" value={`${sub.startDate.slice(0, 10)} ~ ${sub.endDate?.slice(0, 10) ?? "무기한"}`} />
                      <InfoRow icon={Cloud} label="AWS 계정" value={
                        sub.awsAccountId
                          ? <span>{sub.awsAccountAlias && <strong>{sub.awsAccountAlias}</strong>} ({sub.awsAccountId})</span>
                          : "-"
                      } />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">구독 정보 없음</p>
                  )}
                  <Separator />
                  <InfoRow icon={BookOpen} label="수업" value={`${org._count.courses}개`} />
                  <InfoRow icon={Building2} label="그룹(레거시)" value={`${org._count.groups}개`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
