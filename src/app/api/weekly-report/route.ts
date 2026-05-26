import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  // 전체 리포트 (최신순)
  const reports = await prisma.weeklyReport.findMany({
    where: { groupCode: null },
    orderBy: { weekStart: "desc" },
  });

  return NextResponse.json(reports);
}
