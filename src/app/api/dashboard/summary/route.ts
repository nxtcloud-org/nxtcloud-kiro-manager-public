import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessibleGroups } from "@/lib/auth";
import { getSummary } from "@/services/dashboard.service";
import { daysAgo, todayKST } from "@/lib/date";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start") ?? daysAgo(30);
  const end = searchParams.get("end") ?? todayKST();

  const groupCodes = getAccessibleGroups(session);

  const summary = await getSummary({ start, end, groupCodes });

  return NextResponse.json(summary);
}
