import { NextResponse } from "next/server";
import { getSession, getAccessibleGroups } from "@/lib/auth";
import { getCreditDistribution } from "@/services/credit-distribution.service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const groupCodes = getAccessibleGroups(session);

  return NextResponse.json(await getCreditDistribution({ groupCodes }));
}
