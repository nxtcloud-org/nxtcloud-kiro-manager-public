import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const policies = await prisma.accountPolicy.findMany({
    where: { accountId: id },
    include: { policy: true },
  });
  return NextResponse.json(policies.map((ap) => ap.policy));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const { policyId } = body as { policyId: string };
  if (!policyId) return NextResponse.json({ error: "policyId 필요" }, { status: 400 });

  const ap = await prisma.accountPolicy.create({
    data: { accountId: id, policyId },
  });
  return NextResponse.json(ap, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const policyId = searchParams.get("policyId");
  if (!policyId) return NextResponse.json({ error: "policyId 필요" }, { status: 400 });

  await prisma.accountPolicy.deleteMany({ where: { accountId: id, policyId } });
  return NextResponse.json({ ok: true });
}
