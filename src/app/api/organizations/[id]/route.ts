import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOrganizationSchema } from "@/lib/validations";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const org = await prisma.organization.update({ where: { id }, data: parsed.data });
  return NextResponse.json(org);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;

  // cascade 영향 확인
  const [groupCount, subCount, courseCount] = await Promise.all([
    prisma.group.count({ where: { organizationId: id } }),
    prisma.subscription.count({ where: { organizationId: id } }),
    prisma.course.count({ where: { organizationId: id } }),
  ]);

  if (groupCount > 0 || subCount > 0 || courseCount > 0) {
    return NextResponse.json({
      error: "하위 리소스가 존재합니다",
      details: { groups: groupCount, subscriptions: subCount, courses: courseCount },
    }, { status: 409 });
  }

  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
