import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTopUsers } from "@/services/user.service";
import { daysAgo, todayKST } from "@/lib/date";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start") ?? daysAgo(30);
  const end = searchParams.get("end") ?? todayKST();
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "20") || 20), 100);
  const groupCodes = session.role === "ADMIN" ? undefined : session.groups;

  return NextResponse.json(await getTopUsers({ start, end, groupCodes, limit }));
}
