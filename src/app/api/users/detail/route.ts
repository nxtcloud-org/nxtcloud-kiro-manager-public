import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserDetail } from "@/services/user-detail.service";
import { daysAgo, todayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 });

  // IDOR 방지: ADMIN이 아니면 자기 그룹 소속 사용자만 조회 가능
  if (session.role !== "ADMIN" && session.groups.length > 0) {
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        userId,
        group: { code: { in: session.groups } },
      },
    });
    if (!userGroup) {
      return NextResponse.json({ error: "접근 권한 없음" }, { status: 403 });
    }
  }

  const start = searchParams.get("start") ?? daysAgo(30);
  const end = searchParams.get("end") ?? todayKST();

  const data = await getUserDetail(userId, start, end);
  if (!data) return NextResponse.json({ error: "사용자 없음" }, { status: 404 });

  return NextResponse.json(data);
}
