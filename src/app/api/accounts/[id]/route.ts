import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAccountSchema } from "@/lib/validations";
import { hashSync } from "bcryptjs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const account = await prisma.account.update({
    where: { id },
    data: parsed.data,
    select: { id: true, username: true, role: true, displayName: true, groups: true, organizationId: true },
  });
  return NextResponse.json(account);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  if (id === session.sub) return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다" }, { status: 400 });

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// 비밀번호 초기화 (POST /api/accounts/[id]?action=reset-password)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = request.nextUrl;

  if (searchParams.get("action") === "reset-password") {
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }
    const { newPassword } = body as { newPassword: string };
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "비밀번호는 6자 이상" }, { status: 400 });

    await prisma.account.update({
      where: { id },
      data: { passwordHash: hashSync(newPassword, 10) },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "알 수 없는 액션" }, { status: 400 });
}
