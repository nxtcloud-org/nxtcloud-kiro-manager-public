import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateGroupSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true, code: true } },
      userGroups: { include: { kiroUser: { select: { userId: true, displayName: true, email: true, schoolCode: true, studentId: true } } } },
      teamMembers: { orderBy: { teamName: "asc" } },
    },
  });
  if (!group) return NextResponse.json({ error: "그룹 없음" }, { status: 404 });
  return NextResponse.json(group);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const group = await prisma.group.update({ where: { id }, data: parsed.data });
  return NextResponse.json(group);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
