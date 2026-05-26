import { NextRequest, NextResponse } from "next/server";
import { compareSync, hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다" }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const account = await prisma.account.findUnique({ where: { id: session.sub } });
  if (!account) return NextResponse.json({ error: "계정을 찾을 수 없습니다" }, { status: 404 });

  if (!compareSync(currentPassword, account.passwordHash)) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 });
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { passwordHash: hashSync(newPassword, 10) },
  });

  return NextResponse.json({ ok: true });
}
