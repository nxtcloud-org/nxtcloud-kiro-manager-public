import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessibleGroups } from "@/lib/auth";
import {
  getDailyUsageInsight,
  getHourlyUsageInsight,
} from "@/services/usage-insight.service";
import { daysAgo, todayKST } from "@/lib/date";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "daily";
  const groupCodes = getAccessibleGroups(session);

  if (type === "hourly") {
    const date = searchParams.get("date") ?? todayKST();
    return NextResponse.json(
      await getHourlyUsageInsight({ date, groupCodes }),
    );
  }

  const start = searchParams.get("start") ?? daysAgo(30);
  const end = searchParams.get("end") ?? todayKST();
  return NextResponse.json(
    await getDailyUsageInsight({ start, end, groupCodes }),
  );
}
