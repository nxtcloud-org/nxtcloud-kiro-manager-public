import {
  IdentitystoreClient,
  ListUsersCommand,
} from "@aws-sdk/client-identitystore";
import { PrismaClient } from "@prisma/client";

function parseTitle(title: string | undefined): {
  schoolCode: string | null;
  studentId: string | null;
} {
  if (!title) return { schoolCode: null, studentId: null };
  const parts = title.split("_");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { schoolCode: parts[0], studentId: parts[1] };
  }
  return { schoolCode: null, studentId: null };
}

function deriveGroupCode(username: string): string | null {
  if (username.includes("@")) return null;
  const parts = username.split("-");
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    return parts.slice(0, -1).join("-");
  }
  return null;
}

export async function syncIdentityCenterUsers(
  prisma: PrismaClient,
  identityStoreId: string,
): Promise<number> {
  if (!identityStoreId) {
    console.log("[Sync] IDENTITY_STORE_ID 미설정, 건너뜀");
    return 0;
  }

  const client = new IdentitystoreClient({
    region: process.env.AWS_REGION ?? "us-east-1",
  });

  // storeId 정규화 (이미 "d-" 접두면 그대로, 아니면 접두 부착)
  const storeIdSuffix = identityStoreId.startsWith("d-")
    ? identityStoreId
    : `d-${identityStoreId}`;

  let synced = 0;
  let merged = 0;
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new ListUsersCommand({
        IdentityStoreId: identityStoreId,
        NextToken: nextToken,
      }),
    );

    for (const user of res.Users ?? []) {
      if (!user.UserId || !user.UserName) continue;

      const fullName = `${user.Name?.GivenName ?? ""} ${user.Name?.FamilyName ?? ""}`.trim();
      const displayName = user.DisplayName ?? (fullName || user.UserName);
      const email = user.Emails?.find((e) => e.Primary)?.Value ?? user.Emails?.[0]?.Value ?? null;

      const userType = user.UserType ?? null;
      const title = user.Title ?? null;
      const { schoolCode, studentId } = parseTitle(title ?? undefined);
      const groupCode = deriveGroupCode(user.UserName);

      // GAR 로그에서 사용하는 userId 형식: "d-{storeId}.{icUserId}"
      const garUserId = `${storeIdSuffix}.${user.UserId}`;

      // GAR에서 먼저 생성된 레코드가 있으면 업데이트 (해시 이름 → 실명)
      const garUser = await prisma.kiroUser.findUnique({
        where: { userId: garUserId },
      });

      if (garUser) {
        // GAR 레코드가 있으면: IC 순수 UUID 레코드가 중복으로 있을 수 있으므로 삭제 후 업데이트
        const icDuplicate = await prisma.kiroUser.findUnique({
          where: { userId: user.UserId },
        });
        if (icDuplicate) {
          // IC 순수 UUID 레코드의 관계를 삭제 (GAR 레코드에 이미 동일 관계가 있을 수 있으므로)
          await prisma.userGroup.deleteMany({ where: { userId: user.UserId } });
          await prisma.courseEnrollment.deleteMany({ where: { userId: user.UserId } });
          await prisma.teamMember.updateMany({
            where: { userId: user.UserId },
            data: { userId: garUserId },
          });
          await prisma.kiroUser.delete({ where: { userId: user.UserId } });
        }

        // GAR 레코드를 IC 정보로 업데이트 (해시→실명)
        await prisma.kiroUser.update({
          where: { userId: garUserId },
          data: {
            identityCenterId: user.UserId,
            displayName,
            email,
            username: user.UserName,
            userType,
            title,
            schoolCode,
            studentId,
            syncedAt: new Date(),
          },
        });
        merged++;
      } else {
        // GAR 레코드 없음: IC 순수 UUID로 upsert
        await prisma.kiroUser.upsert({
          where: { userId: user.UserId },
          update: {
            identityCenterId: user.UserId,
            displayName,
            email,
            username: user.UserName,
            userType,
            title,
            schoolCode,
            studentId,
            syncedAt: new Date(),
          },
          create: {
            userId: user.UserId,
            identityCenterId: user.UserId,
            displayName,
            email,
            username: user.UserName,
            userType,
            title,
            schoolCode,
            studentId,
            syncedAt: new Date(),
          },
        });
      }

      // 기존 경로: 그룹 매핑 (과도기 유지)
      const effectiveUserId = garUser ? garUserId : user.UserId;
      if (groupCode) {
        const group = await prisma.group.findFirst({
          where: { code: groupCode },
        });
        if (group) {
          await prisma.userGroup.upsert({
            where: {
              userId_groupId: { userId: effectiveUserId, groupId: group.id },
            },
            update: {},
            create: { userId: effectiveUserId, groupId: group.id },
          });
        }
      }

      synced++;
    }

    nextToken = res.NextToken;
  } while (nextToken);

  console.log(`[Sync] ${synced}명 동기화, ${merged}명 GAR 레코드 병합 (해시→실명)`);
  return synced;
}
