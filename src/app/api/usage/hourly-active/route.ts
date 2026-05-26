import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessibleGroups } from "@/lib/auth";
import { getHourlyActiveUsers } from "@/services/usage.service";
import { todayKST } from "@/lib/date";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date") ?? todayKST();

  const groupCodes = getAccessibleGroups(session);

  const data = await getHourlyActiveUsers({ date, groupCodes });

  return NextResponse.json(data);
}
