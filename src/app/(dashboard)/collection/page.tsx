"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";

interface CollectionStatus {
  totalFiles: number;
  totalMessages: number;
  lastCheckedAt: string | null;
}

export default function CollectionPage() {
  const { data, isLoading } = useApi<CollectionStatus>("/api/dashboard/collection-status");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">수집 상태</h1>
        <p className="text-muted-foreground">S3 로그 수집 파이프라인 현황</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>수집된 파일</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? "..." : data?.totalFiles.toLocaleString() ?? "0"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 메시지</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? "..." : data?.totalMessages.toLocaleString() ?? "0"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>마지막 수집</CardDescription>
            <CardTitle className="text-lg">
              {isLoading ? "..." : data?.lastCheckedAt ?? "미실행"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">워커 실행 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>배치 워커는 별도 프로세스로 실행됩니다:</p>
          <code className="block rounded bg-muted p-3 font-mono text-xs">
            DATABASE_URL=&quot;...&quot; AWS_ACCOUNT_ID=&quot;...&quot; S3_BUCKET=&quot;...&quot; pnpm worker
          </code>
          <p>워커가 실행되면 매 {process.env.COLLECT_INTERVAL_MINUTES ?? 15}분마다 S3에서 새 로그를 수집합니다.</p>
          <p>프로덕션에서는 docker-compose로 app과 worker가 함께 실행됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
