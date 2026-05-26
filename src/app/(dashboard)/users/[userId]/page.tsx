"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Hi } from "@/components/ui/highlight";
import { useApi } from "@/hooks/use-api";
import { ArrowLeft, User, GraduationCap, Mail, Hash, Clock, MessageSquare, FileText } from "lucide-react";

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

interface UserDetail {
  profile: {
    displayName: string;
    email: string | null;
    schoolCode: string | null;
    studentId: string | null;
    userType: string | null;
    username: string | null;
    courses: { name: string; team: string | null }[];
  };
  summary: {
    totalMessages: number;
    activeDays: number;
    avgDailyMessages: number;
    totalPromptChars: number;
    totalResponseChars: number;
    avgPromptLength: number;
    avgResponseLength: number;
    firstActiveDate: string | null;
    lastActiveDate: string | null;
  };
  daily: { date: string; messages: number }[];
  hourly: { hour: number; messages: number }[];
  models: { model: string; count: number }[];
  triggerTypes: { type: string; count: number }[];
  credits: {
    date: string;
    creditsUsed: number;
    chatConversations: number;
    totalMessages: number;
    subscriptionTier: string | null;
  }[];
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(today());

  const { data, isLoading } = useApi<UserDetail>(
    `/api/users/detail?userId=${encodeURIComponent(userId)}&start=${start}&end=${end}`,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/users" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 사용자 목록으로
        </Link>
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { profile, summary } = data;
  const totalChars = summary.totalPromptChars + summary.totalResponseChars;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/users" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> 사용자 목록
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
          <p className="text-muted-foreground">개인 활동 리포트 — AI 도구 활용 패턴을 상세하게 확인합니다</p>
        </div>
        <DateRangePicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>

      {/* 안내 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 text-[13px] text-muted-foreground">
          이 페이지는 해당 학생의 KIRO IDE 사용 패턴을 보여줍니다. 활동 빈도, 선호 시간대, 사용 모델 등을 파악하여 맞춤 지원에 활용할 수 있습니다. 프롬프트/응답 원문은 포함되지 않으며, 통계 수치만 표시됩니다.
        </CardContent>
      </Card>

      {/* 프로필 + 요약 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 프로필 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow icon={User} label="이름" value={profile.displayName} />
            {profile.schoolCode && <InfoRow icon={GraduationCap} label="소속" value={profile.schoolCode} />}
            {profile.studentId && <InfoRow icon={Hash} label="학번" value={profile.studentId} />}
            {profile.email && <InfoRow icon={Mail} label="이메일" value={profile.email} />}
            {profile.courses.length > 0 && (
              <div className="flex items-center gap-3 py-1">
                <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground w-16 shrink-0">수강</span>
                <div className="flex flex-wrap gap-1">
                  {profile.courses.map((c) => (
                    <Badge key={c.name} variant="secondary" className="text-xs">
                      {c.name}{c.team ? ` · ${c.team}` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 활동 요약 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">활동 요약</CardTitle>
            <CardDescription>{start} ~ {end}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-[15px] leading-relaxed">
            <p>
              총 <Hi>{summary.totalMessages.toLocaleString()}건</Hi>의 AI 대화,{" "}
              <Hi>{summary.activeDays}일</Hi> 활동.
              일평균 <Hi>{summary.avgDailyMessages}건</Hi>.
            </p>
            <p>
              프롬프트 평균 <Hi>{summary.avgPromptLength.toLocaleString()}자</Hi>,
              응답 평균 <Hi>{summary.avgResponseLength.toLocaleString()}자</Hi>.
              총 <Hi>{Math.round(totalChars / 10000)}만자</Hi>의 텍스트를 AI와 주고받았습니다.
            </p>
            {summary.firstActiveDate && (
              <p className="text-sm text-muted-foreground">
                첫 활동: {summary.firstActiveDate} · 최근 활동: {summary.lastActiveDate}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 일별 트렌드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">일별 활동 추이</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(v) => `${v}`} formatter={(value) => [Number(value).toLocaleString(), "메시지"]} />
                <Area type="monotone" dataKey="messages" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 시간대별 + 모델 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시간대별 패턴</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.hourly}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}시`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => `${v}시 (KST)`} formatter={(value) => [Number(value).toLocaleString(), "메시지"]} />
                <Bar dataKey="messages" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용 모델</CardTitle>
          </CardHeader>
          <CardContent>
            {data.models.length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>모델</TableHead>
                    <TableHead className="text-right">사용 횟수</TableHead>
                    <TableHead className="text-right">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.models.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell className="font-medium">{m.model}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {summary.totalMessages > 0 ? Math.round((m.count / summary.totalMessages) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 크레딧 이력 */}
      {data.credits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">크레딧 사용 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>플랜</TableHead>
                  <TableHead className="text-right">크레딧</TableHead>
                  <TableHead className="text-right">대화 수</TableHead>
                  <TableHead className="text-right">메시지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.credits.map((c) => (
                  <TableRow key={c.date}>
                    <TableCell>{c.date}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.subscriptionTier ?? "-"}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{c.creditsUsed}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.chatConversations}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.totalMessages}</TableCell>
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
