import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCourseSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const courses = await prisma.course.findMany({
    include: {
      organization: { select: { name: true, code: true } },
      _count: { select: { enrollments: true } },
      enrollments: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 전체 사용자별 소속 그룹 수 계산
  const userCourseCount = new Map<string, number>();
  courses.forEach((c) => c.enrollments.forEach((e) => {
    userCourseCount.set(e.userId, (userCourseCount.get(e.userId) ?? 0) + 1);
  }));

  const result = courses.map((c) => {
    const total = c._count.enrollments;
    const overlapping = c.enrollments.filter((e) => (userCourseCount.get(e.userId) ?? 0) > 1).length;
    return {
      ...c,
      enrollments: undefined,
      overlapCount: overlapping,
      uniqueCount: total - overlapping,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const course = await prisma.course.create({ data: parsed.data });
  return NextResponse.json(course, { status: 201 });
}
