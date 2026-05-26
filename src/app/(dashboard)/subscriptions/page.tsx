"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";

interface Sub {
  id: string;
  tier: string;
  seatCount: number;
  creditLimit: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  awsAccountId: string | null;
  awsAccountAlias: string | null;
  organization: { name: string; code: string };
}

export default function SubscriptionsPage() {
  const { data, isLoading } = useApi<Sub[]>("/api/subscriptions");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">구독 관리</h1>
        <p className="text-muted-foreground">조직별 KIRO 구독 현황</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">구독 목록</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 구독이 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>조직</TableHead>
                  <TableHead>티어</TableHead>
                  <TableHead className="text-right">좌석</TableHead>
                  <TableHead className="text-right">크레딧 한도</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>AWS 계정</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.organization.name}</TableCell>
                    <TableCell><Badge variant="secondary">{sub.tier}</Badge></TableCell>
                    <TableCell className="text-right">{sub.seatCount}</TableCell>
                    <TableCell className="text-right">{sub.creditLimit}</TableCell>
                    <TableCell className="text-sm">
                      {sub.startDate.slice(0, 10)} ~ {sub.endDate?.slice(0, 10) ?? "무기한"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sub.awsAccountId ? (
                        <div>
                          <span className="font-medium">{sub.awsAccountAlias ?? ""}</span>
                          <span className="text-muted-foreground"> ({sub.awsAccountId})</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.isActive ? "default" : "destructive"}>
                        {sub.isActive ? "활성" : "만료"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
