import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AccountRole } from "@prisma/client";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다");
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

const TOKEN_COOKIE = "kiro-token";
const TOKEN_EXPIRY = "24h";

export interface JWTPayload {
  sub: string;
  username: string;
  role: AccountRole;
  groups: string[];
  displayName: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isAdmin(session: JWTPayload): boolean {
  return session.role === "ADMIN";
}

export function canAccessGroup(
  session: JWTPayload,
  groupCode: string,
): boolean {
  if (session.role === "ADMIN") return true;
  if (session.groups.length === 0) return false; // 빈 그룹 = 접근 불가 (최소 권한)
  return session.groups.includes(groupCode);
}

/** 세션에서 접근 가능한 그룹 코드 배열 반환. ADMIN이면 undefined (전체). */
export function getAccessibleGroups(session: JWTPayload): string[] | undefined {
  if (session.role === "ADMIN") return undefined;
  return session.groups;
}
