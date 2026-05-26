import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPolicySchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { accountPolicies: { include: { account: { select: { id: true, username: true, displayName: true } } } } },
  });
  if (!policy) return NextResponse.json({ error: "정책 없음" }, { status: 404 });
  return NextResponse.json(policy);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "정책 없음" }, { status: 404 });
  if (existing.isSystem) return NextResponse.json({ error: "시스템 정책은 수정할 수 없습니다" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const policy = await prisma.policy.update({ where: { id }, data: parsed.data });
  return NextResponse.json(policy);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "정책 없음" }, { status: 404 });
  if (existing.isSystem) return NextResponse.json({ error: "시스템 정책은 삭제할 수 없습니다" }, { status: 403 });

  await prisma.policy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
