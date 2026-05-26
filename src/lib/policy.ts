/**
 * IAM 스타일 정책 평가 엔진
 * 평가 순서: Deny 우선 → Allow 매치 → 기본 Deny
 */

export interface PolicyStatement {
  effect: "allow" | "deny";
  actions: string[];
  resources: string[];
}

export interface PolicyDocument {
  version: string;
  statements: PolicyStatement[];
}

/** 액션이 패턴에 매치하는지 (와일드카드 지원) */
function matchAction(pattern: string, action: string): boolean {
  if (pattern === "*") return true;
  if (pattern === action) return true;
  // "org:*" 패턴: "org:" 프리픽스 매치
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -1); // "org:"
    return action.startsWith(prefix);
  }
  return false;
}

/** 리소스가 패턴에 매치하는지 (와일드카드 지원) */
function matchResource(pattern: string, resource: string): boolean {
  if (pattern === "*") return true;
  if (pattern === resource) return true;
  // "org:a-univ/*" 패턴
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1); // "org:a-univ/"
    return resource.startsWith(prefix) || resource === pattern.slice(0, -2);
  }
  return false;
}

/** 정책 문서 배열을 평가하여 허용 여부 반환 */
export function evaluatePolicy(
  documents: PolicyDocument[],
  action: string,
  resource: string,
): boolean {
  // 1단계: 명시적 Deny 체크
  for (const doc of documents) {
    for (const stmt of doc.statements) {
      if (stmt.effect !== "deny") continue;
      const actionMatch = stmt.actions.some((a) => matchAction(a, action));
      const resourceMatch = stmt.resources.some((r) => matchResource(r, resource));
      if (actionMatch && resourceMatch) return false;
    }
  }

  // 2단계: Allow 체크
  for (const doc of documents) {
    for (const stmt of doc.statements) {
      if (stmt.effect !== "allow") continue;
      const actionMatch = stmt.actions.some((a) => matchAction(a, action));
      const resourceMatch = stmt.resources.some((r) => matchResource(r, resource));
      if (actionMatch && resourceMatch) return true;
    }
  }

  // 3단계: 기본 Deny
  return false;
}

/** 시스템 기본 정책 정의 */
export const SYSTEM_POLICIES: Record<string, { description: string; document: PolicyDocument }> = {
  AdminFullAccess: {
    description: "관리자 전체 접근 권한",
    document: {
      version: "2026-04-05",
      statements: [
        { effect: "allow", actions: ["*"], resources: ["*"] },
      ],
    },
  },
  SalesOrgManage: {
    description: "영업팀 — 조직/구독 관리 + 대시보드 읽기",
    document: {
      version: "2026-04-05",
      statements: [
        {
          effect: "allow",
          actions: ["org:*", "sub:*", "dashboard:view", "report:view"],
          resources: ["*"],
        },
      ],
    },
  },
  DemoReadOnly: {
    description: "데모 — 대시보드 읽기 전용",
    document: {
      version: "2026-04-05",
      statements: [
        {
          effect: "allow",
          actions: ["dashboard:view", "report:view"],
          resources: ["*"],
        },
      ],
    },
  },
};

/** 조직 코드 기반 SCHOOL 정책 생성 */
export function createSchoolPolicy(orgCode: string, groupCodes: string[]): PolicyDocument {
  const resources = groupCodes.length > 0
    ? groupCodes.map((g) => `group:${g}`)
    : [`org:${orgCode}/*`];

  return {
    version: "2026-04-05",
    statements: [
      {
        effect: "allow",
        actions: [
          "dashboard:view",
          "user:view",
          "user:view-detail",
          "group:view",
          "course:view",
          "report:view",
        ],
        resources: [...resources, `org:${orgCode}`],
      },
    ],
  };
}
