import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluatePolicy, type PolicyDocument } from "@/lib/policy";
import { simulatePolicySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session)) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "잘못된 요청" }, { status: 400 }); }

  const parsed = simulatePolicySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값 오류" }, { status: 400 });

  const { accountId, action, resource } = parsed.data;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { accountPolicies: { include: { policy: true } } },
  });
  if (!account) return NextResponse.json({ error: "계정 없음" }, { status: 404 });

  const documents = account.accountPolicies.map((ap) => ap.policy.document as unknown as PolicyDocument);
  const allowed = evaluatePolicy(documents, action, resource);

  return NextResponse.json({
    allowed,
    account: { id: account.id, username: account.username, role: account.role },
    action,
    resource,
    policiesEvaluated: account.accountPolicies.map((ap) => ap.policy.name),
  });
}
