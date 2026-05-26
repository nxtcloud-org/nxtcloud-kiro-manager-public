import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: id },
    include: { kiroUser: { select: { userId: true, displayName: true, email: true, schoolCode: true, studentId: true } } },
    orderBy: { enrolledAt: "desc" },
  });
  return NextResponse.json(enrollments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const data = body as { userId?: string; userIds?: string[]; teamName?: string };

  // 단건 등록
  if (data.userId) {
    const enrollment = await prisma.courseEnrollment.create({
      data: { userId: data.userId, courseId: id, teamName: data.teamName },
    });
    return NextResponse.json(enrollment, { status: 201 });
  }

  // 배치 등록
  if (data.userIds && data.userIds.length > 0) {
    const result = await prisma.courseEnrollment.createMany({
      data: data.userIds.map((userId) => ({ userId, courseId: id, teamName: data.teamName })),
      skipDuplicates: true,
    });
    return NextResponse.json({ count: result.count }, { status: 201 });
  }

  return NextResponse.json({ error: "userId 또는 userIds 필요" }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 });

  await prisma.courseEnrollment.deleteMany({ where: { courseId: id, userId } });
  return NextResponse.json({ ok: true });
}
