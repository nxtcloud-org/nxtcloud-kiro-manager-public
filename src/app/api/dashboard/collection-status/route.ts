import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getCollectionStatus } from "@/services/dashboard.service";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  return NextResponse.json(await getCollectionStatus());
}
