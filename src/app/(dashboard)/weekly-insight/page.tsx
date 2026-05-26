"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/hooks/use-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Download, Check } from "lucide-react";
import { useState } from "react";
import type React from "react";

interface AntiPattern {
  label: string;
  count: number;
  examples?: string[];
}

interface Report {
  id: string;
  weekStart: string;
  weekEnd: string;
  messageCount: number;
  categories: Record<string, unknown>;
  keywords: string[];
  insights: string;
  createdAt: string;
}

const DELEGATION_LABELS: Record<string, string> = {
  "1": "자립형",
  "2": "협업형",
  "3": "질문형",
  "4": "의존형",
  "5": "외주형",
};

const DELEGATION_COLORS: Record<string, string> = {
  "1": "bg-emerald-500",
  "2": "bg-green-500",
  "3": "bg-slate-400",
  "4": "bg-amber-500",
  "5": "bg-rose-500",
};

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function extractExtras(cats: Record<string, unknown>) {
  const ideaTopics = (cats._ideaTopics as string[]) ?? [];
  const educationNeeds = (cats._educationNeeds as string[]) ?? [];
  const delegationDist = (cats._delegationDist as Record<string, number>) ?? {};
  const goodPatterns = (cats._goodPatterns as AntiPattern[]) ?? [];
  const antiPatterns = (cats._antiPatterns as AntiPattern[]) ?? [];
  const securityRisks = (cats._securityRisks as AntiPattern[]) ?? [];
  const educationSuggestions = (cats._educationSuggestions as string[]) ?? [];
  return { ideaTopics, educationNeeds, delegationDist, goodPatterns, antiPatterns, securityRisks, educationSuggestions };
}

function formatReportText(report: Report): string {
  const cats = { ...report.categories };
  const { ideaTopics, educationNeeds, delegationDist, goodPatterns, antiPatterns, securityRisks, educationSuggestions } = extractExtras(cats);

  const catLines = Object.entries(cats)
    .filter(([k]) => !k.startsWith("_"))
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([cat, count]) => `  - ${cat}: ${count}건`)
    .join("\n");

  const delegationTotal = Object.values(delegationDist).reduce((s, c) => s + c, 0);
  const delegationLines = delegationTotal > 0
    ? Object.entries(delegationDist)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([k, v]) => `  - ${DELEGATION_LABELS[k] ?? k}(${k}): ${v}건 (${Math.round((v / delegationTotal) * 100)}%)`)
        .join("\n")
    : "";

  return `주간 프롬프트 인사이트
${report.weekStart} ~ ${report.weekEnd} (${report.messageCount}건 분석)

[활용 카테고리]
${catLines}

[주요 기술 키워드]
${(report.keywords as string[]).join(", ")}

${ideaTopics.length > 0 ? `[프로젝트 아이디어 동향]\n${ideaTopics.map(t => `  - ${t}`).join("\n")}\n\n` : ""}${educationNeeds.length > 0 ? `[교육 필요 영역]\n${educationNeeds.map(n => `  - ${n}`).join("\n")}\n\n` : ""}${delegationLines ? `[AI 활용 성숙도 — 사고 의존도]\n${delegationLines}\n\n` : ""}${goodPatterns.length > 0 ? `[잘한 패턴 — 사고력 확장형]\n${goodPatterns.map(p => {
  const head = `  - ${p.label}: ${p.count}건`;
  const ex = p.examples && p.examples.length > 0
    ? "\n" + p.examples.map(e => `      예시: "${e}"`).join("\n")
    : "";
  return head + ex;
}).join("\n")}\n\n` : ""}${antiPatterns.length > 0 ? `[주요 의존 패턴]\n${antiPatterns.map(p => {
  const head = `  - ${p.label}: ${p.count}건`;
  const ex = p.examples && p.examples.length > 0
    ? "\n" + p.examples.map(e => `      예시: "${e}"`).join("\n")
    : "";
  return head + ex;
}).join("\n")}\n\n` : ""}${securityRisks.length > 0 ? `[⚠️ 보안 위험 프롬프트]\n${securityRisks.map(p => {
  const head = `  - ${p.label}: ${p.count}건`;
  const ex = p.examples && p.examples.length > 0
    ? "\n" + p.examples.map(e => `      예시: "${e}"`).join("\n")
    : "";
  return head + ex;
}).join("\n")}\n\n` : ""}${educationSuggestions.length > 0 ? `[사고력 개발 교육 제안]\n${educationSuggestions.map(s => `  - ${stripMarkdown(s)}`).join("\n")}\n\n` : ""}[AI 분석 인사이트]
${stripMarkdown(report.insights)}
`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "복사됨" : "복사"}
    </Button>
  );
}

function DownloadButton({ text, filename }: { text: string; filename: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download className="h-3.5 w-3.5" />
      다운로드
    </Button>
  );
}

export default function WeeklyInsightPage() {
  const { data, isLoading } = useApi<Report[]>("/api/weekly-report");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">주간 인사이트</h1>
        <p className="text-muted-foreground">
          Bedrock AI가 분석한 학생들의 프롬프트 활용 패턴과 교육 제안
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 text-[13px] text-muted-foreground">
          매주 월요일, S3의 프롬프트 데이터를 샘플링하여 Bedrock AI가 카테고리 분류 + 키워드 추출 + 아이디어/교육 필요 분석 + 인사이트를 자동 생성합니다.
          개별 프롬프트 원문은 저장/표시되지 않으며, 집단 통계만 활용됩니다.
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            아직 생성된 주간 리포트가 없습니다. 매주 월요일 자동으로 생성됩니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {data.map((report, reportIdx) => {
            const cats = { ...report.categories };
            const { ideaTopics, educationNeeds, delegationDist, goodPatterns, antiPatterns, securityRisks, educationSuggestions } = extractExtras(cats);

            const numericCats = Object.entries(cats).filter(([k]) => !k.startsWith("_")) as [string, number][];
            const totalClassified = numericCats.reduce((s, [, c]) => s + c, 0);
            const sortedCats = numericCats
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => ({
                cat,
                count,
                pct: totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0,
              }));

            const reportText = formatReportText(report);

            return (
              <ReportCard
                key={report.id}
                defaultOpen={reportIdx === 0}
                header={
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <CardTitle className="text-lg">{report.weekStart} ~ {report.weekEnd}</CardTitle>
                      <CardDescription>{report.messageCount}건 샘플 분석</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={reportText} />
                      <DownloadButton text={reportText} filename={`weekly-insight-${report.weekStart}.txt`} />
                      <Badge variant="secondary" className="text-xs">Bedrock AI</Badge>
                    </div>
                  </div>
                }
              >
                  {/* 1. 프로젝트 아이디어 동향 */}
                  {ideaTopics.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">프로젝트 아이디어 동향</p>
                      <p className="text-xs text-muted-foreground mb-2">학생들이 AI와 함께 만들고 있는 것</p>
                      <div className="flex flex-wrap gap-2">
                        {ideaTopics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. 교육 필요 영역 */}
                  {educationNeeds.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-3">교육 필요 영역</p>
                        <p className="text-xs text-muted-foreground mb-2">학생들이 어려워하거나 도움을 요청하는 부분</p>
                        <div className="flex flex-wrap gap-2">
                          {educationNeeds.map((need) => (
                            <Badge key={need} variant="secondary" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{need}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 2.5 AI 활용 성숙도 — 사고 의존도 분포 */}
                  {Object.values(delegationDist).reduce((s, c) => s + c, 0) > 0 && (
                    <>
                      <Separator />
                      <MaturitySection delegationDist={delegationDist} />
                    </>
                  )}

                  {/* 2.6 프롬프트 사례 탭 (잘한것 / 의존 패턴 / 보안 위험) */}
                  {(goodPatterns.length > 0 || antiPatterns.length > 0 || securityRisks.length > 0) && (
                    <>
                      <Separator />
                      <PromptSamplesTabs
                        goodPatterns={goodPatterns}
                        antiPatterns={antiPatterns}
                        securityRisks={securityRisks}
                      />
                    </>
                  )}

                  {/* 2.7 사고력 개발 교육 제안 */}
                  {educationSuggestions.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">사고력 개발 교육 제안</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          관찰된 의존 패턴을 자립형으로 전환하기 위한 워크숍/실습 주제
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {educationSuggestions.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            >
                              {renderInline(s)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* 3. AI 인사이트 */}
                  <div>
                    <p className="text-sm font-medium mb-3">AI 분석 인사이트</p>
                    <div className="text-[15px] leading-relaxed space-y-3">
                      {report.insights.split("\n\n").map((paragraph, i) => (
                        <p key={i}>{renderInline(paragraph)}</p>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 4. 키워드 + 카테고리 (참고) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-2 text-muted-foreground">기술 키워드</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(report.keywords as string[]).map((kw, i) => (
                          <Badge key={kw} variant={i < 5 ? "default" : "outline"} className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2 text-muted-foreground">활용 카테고리</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sortedCats.map(({ cat, pct }) => (
                          <Badge key={cat} variant="outline" className="text-xs tabular-nums">{cat} {pct}%</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </ReportCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MaturitySection({ delegationDist }: { delegationDist: Record<string, number> }) {
  const total = Object.values(delegationDist).reduce((s, c) => s + c, 0);
  const entries = ["1", "2", "3", "4", "5"].map((k) => ({
    level: k,
    label: DELEGATION_LABELS[k],
    count: delegationDist[k] ?? 0,
    pct: total > 0 ? Math.round(((delegationDist[k] ?? 0) / total) * 100) : 0,
    color: DELEGATION_COLORS[k],
  }));

  const independentPct = entries.filter(e => Number(e.level) <= 2).reduce((s, e) => s + e.pct, 0);
  const dependentPct = entries.filter(e => Number(e.level) >= 4).reduce((s, e) => s + e.pct, 0);

  return (
    <div>
      <p className="text-sm font-medium mb-1">AI 활용 성숙도</p>
      <p className="text-xs text-muted-foreground mb-3">
        사고 외주화(외주형) ↔ 사고 확장(자립형) 관점에서 본 프롬프트 의존도 분포
      </p>

      <div className="flex h-6 w-full overflow-hidden rounded-md border border-border">
        {entries.map((e) => e.pct > 0 && (
          <div
            key={e.level}
            className={`${e.color} flex items-center justify-center text-[10px] font-medium text-white transition-all`}
            style={{ width: `${e.pct}%` }}
            title={`${e.label}(${e.level}): ${e.count}건 (${e.pct}%)`}
          >
            {e.pct >= 8 ? `${e.pct}%` : ""}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
        {entries.map((e) => (
          <div key={e.level} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${e.color}`} />
            <span className="text-muted-foreground">
              {e.label}({e.level}): <span className="tabular-nums font-medium text-foreground">{e.pct}%</span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        자립·협업 그룹 <span className="font-medium text-emerald-600 dark:text-emerald-400">{independentPct}%</span>
        {" · "}
        의존·외주 그룹 <span className="font-medium text-rose-600 dark:text-rose-400">{dependentPct}%</span>
      </p>
    </div>
  );
}

function PatternList({
  patterns,
  tone,
  emptyMessage,
}: {
  patterns: AntiPattern[];
  tone: "good" | "anti" | "security";
  emptyMessage: string;
}) {
  if (patterns.length === 0) {
    return <p className="text-xs text-muted-foreground py-4">{emptyMessage}</p>;
  }

  const styles = {
    good: {
      border: "border-emerald-200 dark:border-emerald-900/50",
      bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      dot: "text-emerald-500",
    },
    anti: {
      border: "border-rose-200 dark:border-rose-900/50",
      bg: "bg-rose-50/40 dark:bg-rose-950/20",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      dot: "text-rose-400",
    },
    security: {
      border: "border-amber-300 dark:border-amber-900/60",
      bg: "bg-amber-50/60 dark:bg-amber-950/20",
      badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
      dot: "text-amber-500",
    },
  }[tone];

  return (
    <div className="space-y-2.5">
      {patterns.map((p) => (
        <div
          key={p.label}
          className={`rounded-md border ${styles.border} ${styles.bg} px-3 py-2`}
        >
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${styles.badge}`}>
              {p.label}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">{p.count}건</span>
          </div>
          {p.examples && p.examples.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              {p.examples.map((ex, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className={styles.dot}>·</span>
                  <span className="italic">&ldquo;{ex}&rdquo;</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function PromptSamplesTabs({
  goodPatterns,
  antiPatterns,
  securityRisks,
}: {
  goodPatterns: AntiPattern[];
  antiPatterns: AntiPattern[];
  securityRisks: AntiPattern[];
}) {
  const goodTotal = goodPatterns.reduce((s, p) => s + p.count, 0);
  const antiTotal = antiPatterns.reduce((s, p) => s + p.count, 0);
  const secTotal = securityRisks.reduce((s, p) => s + p.count, 0);

  const defaultTab = secTotal > 0 ? "security" : antiTotal > 0 ? "anti" : "good";

  return (
    <div>
      <p className="text-sm font-medium mb-1">프롬프트 사례</p>
      <p className="text-xs text-muted-foreground mb-3">
        각 패턴의 익명화된 예시입니다. 학생 식별정보는 모두 마스킹되어 있습니다.
      </p>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="good">
            잘한 것 <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">{goodTotal}</span>
          </TabsTrigger>
          <TabsTrigger value="anti">
            의존 패턴 <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">{antiTotal}</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
            <span className="ml-1">보안 위험</span>
            <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">{secTotal}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="good" className="pt-3">
          <p className="text-xs text-muted-foreground mb-3">
            사고력을 확장하는 방향으로 AI를 활용한 모범 사례 — 교육 자료로 공유 권장
          </p>
          <PatternList
            patterns={goodPatterns}
            tone="good"
            emptyMessage="이번 주 특별히 돋보이는 모범 패턴은 관찰되지 않았습니다."
          />
        </TabsContent>

        <TabsContent value="anti" className="pt-3">
          <p className="text-xs text-muted-foreground mb-3">
            개선 여지가 있는 프롬프트 유형 — 학생 비판이 아닌 교육 설계 힌트로 활용
          </p>
          <PatternList
            patterns={antiPatterns}
            tone="anti"
            emptyMessage="뚜렷한 의존 패턴이 관찰되지 않았습니다."
          />
        </TabsContent>

        <TabsContent value="security" className="pt-3">
          <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mb-3">
            자격증명·개인정보·토큰이 AI에 전송된 사례. 즉시 보안 교육 및 자격증명 회수(로테이션) 고려 필요.
          </p>
          <PatternList
            patterns={securityRisks}
            tone="security"
            emptyMessage="보안 위험 프롬프트가 관찰되지 않았습니다. 👍"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({
  defaultOpen,
  header,
  children,
}: {
  defaultOpen: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">{open ? "▼" : "▶"}</span>
          <div className="flex-1">{header}</div>
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-5">{children}</CardContent>}
    </Card>
  );
}
