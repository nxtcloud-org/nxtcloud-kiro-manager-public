import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccountSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const accounts = await prisma.account.findMany({
    select: { id: true, username: true, role: true, displayName: true, groups: true, organizationId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 }); }
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }

  const existing = await prisma.account.findUnique({ where: { username: parsed.data.username } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 아이디" }, { status: 409 });
  }

  const account = await prisma.account.create({
    data: {
      username: parsed.data.username,
      passwordHash: hashSync(parsed.data.password, 10),
      role: parsed.data.role,
      displayName: parsed.data.displayName,
      groups: parsed.data.groups,
    },
    select: { id: true, username: true, role: true, displayName: true },
  });

  return NextResponse.json(account, { status: 201 });
}
