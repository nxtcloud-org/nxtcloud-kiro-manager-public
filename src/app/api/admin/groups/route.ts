import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGroupSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const where = isAdmin(session) ? {} : { organization: { code: { in: session.groups.map((g) => g.split("-")[0]) } } };
  const groups = await prisma.group.findMany({
    where,
    include: {
      organization: { select: { name: true, code: true } },
      _count: { select: { userGroups: true, teamMembers: true } },
      teamMembers: { select: { teamName: true }, distinct: ["teamName"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = groups.map((g) => ({
    ...g,
    teamCount: g.teamMembers.length,
    teamMembers: undefined,
  }));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const group = await prisma.group.create({ data: parsed.data });
  return NextResponse.json(group, { status: 201 });
}
