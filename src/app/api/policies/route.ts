import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPolicySchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const policies = await prisma.policy.findMany({
    include: { _count: { select: { accountPolicies: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(policies);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류", details: parsed.error.issues }, { status: 400 });

  const policy = await prisma.policy.create({ data: parsed.data });
  return NextResponse.json(policy, { status: 201 });
}
