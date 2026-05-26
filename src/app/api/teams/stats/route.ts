import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessibleGroups } from "@/lib/auth";
import { getTeamStats } from "@/services/team.service";
import { daysAgo, todayKST } from "@/lib/date";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const groupCode = searchParams.get("course");
  if (!groupCode) return NextResponse.json({ error: "course 파라미터 필요" }, { status: 400 });

  const start = searchParams.get("start") ?? daysAgo(30);
  const end = searchParams.get("end") ?? todayKST();
  const groupCodes = getAccessibleGroups(session);

  return NextResponse.json(await getTeamStats({ groupCode, start, end, groupCodes }));
}
