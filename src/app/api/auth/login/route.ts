import { NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다" },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;

  const account = await prisma.account.findUnique({
    where: { username },
  });

  if (!account || !compareSync(password, account.passwordHash)) {
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  const token = await signToken({
    sub: account.id,
    username: account.username,
    role: account.role,
    groups: account.groups,
    displayName: account.displayName,
  });

  const response = NextResponse.json({
    user: {
      id: account.id,
      username: account.username,
      role: account.role,
      displayName: account.displayName,
    },
  });

  response.cookies.set("kiro-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24시간
  });

  return response;
}
