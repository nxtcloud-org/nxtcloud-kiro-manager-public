import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubscriptionSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const subs = await prisma.subscription.findMany({
    include: { organization: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subs);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 }); }
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류", details: parsed.error.issues }, { status: 400 });
  }

  const sub = await prisma.subscription.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });
  return NextResponse.json(sub, { status: 201 });
}
