import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrganizationSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { groups: true, courses: true } },
      subscriptions: {
        where: { isActive: true },
        select: {
          tier: true, seatCount: true, creditLimit: true,
          startDate: true, endDate: true, isActive: true,
          awsAccountId: true, awsAccountAlias: true,
        },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(orgs);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 }); }
  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류", details: parsed.error.issues }, { status: 400 });
  }

  const org = await prisma.organization.create({ data: parsed.data });
  return NextResponse.json(org, { status: 201 });
}
