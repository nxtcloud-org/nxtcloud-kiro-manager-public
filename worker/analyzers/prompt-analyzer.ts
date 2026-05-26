import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { PrismaClient } from "@prisma/client";
import { listS3Keys, getS3Object } from "../../src/lib/s3";
import { gunzipSync } from "zlib";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const HAIKU_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const SONNET_MODEL = "us.anthropic.claude-sonnet-4-20250514-v1:0";

interface ClassifyResult {
  categories: Record<string, number>;
  keywords: string[];
  ideaTopics: string[];
  educationNeeds: string[];
  delegationDist: Record<string, number>;
  goodPatterns: { label: string; count: number; examples: string[] }[];
  antiPatterns: { label: string; count: number; examples: string[] }[];
  securityRisks: { label: string; count: number; examples: string[] }[];
  educationSuggestions: string[];
}

// 사고 의존도 라벨 (1=자립형 ~ 5=완전외주형)
const DELEGATION_LABELS: Record<string, string> = {
  "1": "자립형",
  "2": "협업형",
  "3": "질문형",
  "4": "의존형",
  "5": "외주형",
};

async function invokeModel(
  modelId: string,
  prompt: string,
  maxTokens = 2048,
): Promise<string> {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    }),
  );
  const body = JSON.parse(new TextDecoder().decode(res.body));
  return body.content[0].text;
}

async function collectPrompts(
  bucket: string,
  accountId: string,
  region: string,
  weekStart: string,
  weekEnd: string,
): Promise<string[]> {
  const prompts: string[] = [];
  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const prefix = `kiro/AWSLogs/${accountId}/KiroLogs/GenerateAssistantResponse/${region}/${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/`;

    const keys = await listS3Keys(bucket, prefix);
    // 20% 샘플링
    const sampled = keys.filter(() => Math.random() < 0.2);

    for (const key of sampled.slice(0, 100)) {
      try {
        const bytes = await getS3Object(bucket, key);
        const raw = gunzipSync(bytes);
        const data = JSON.parse(raw.toString("utf-8"));
        const records = Array.isArray(data)
          ? data
          : (data as Record<string, unknown>).records ?? [data];

        for (const rec of records as Record<string, unknown>[]) {
          const request =
            (rec.generateAssistantResponseEventRequest as Record<string, unknown>) ?? rec;
          const prompt = (request.prompt as string) ?? "";
          if (prompt.length > 20) {
            // 앞 300자만 (분류에 충분)
            prompts.push(prompt.slice(0, 300));
          }
        }
      } catch {
        // skip
      }
    }
  }

  return prompts;
}

async function classifyBatch(prompts: string[]): Promise<ClassifyResult> {
  const categories: Record<string, number> = {};
  const keywordMap: Record<string, number> = {};
  const ideaMap: Record<string, number> = {};
  const needsMap: Record<string, number> = {};
  const delegationDist: Record<string, number> = {};
  const antiPatternMap: Record<string, number> = {};
  const antiPatternExamples: Record<string, string[]> = {};
  const goodPatternMap: Record<string, number> = {};
  const goodPatternExamples: Record<string, string[]> = {};
  const securityRiskMap: Record<string, number> = {};
  const securityRiskExamples: Record<string, string[]> = {};
  const suggestionMap: Record<string, number> = {};

  // 30개씩 배치로 Haiku에 분류 요청 (필드 확장으로 응답 크기 증가 → 배치 축소)
  const BATCH_SIZE = 30;
  for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
    const batch = prompts.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((p, idx) => `[${idx + 1}] ${p}`).join("\n\n");

    const result = await invokeModel(
      HAIKU_MODEL,
      `다음은 학생들이 AI 코딩 도구에 보낸 프롬프트입니다. 4가지를 분석하세요:

1. 각 프롬프트를 카테고리 중 하나로 분류
   카테고리: 코드생성, 디버깅, 코드리뷰, 리팩토링, 설명요청, 설계/아키텍처, 테스트작성, 문서작성, 기타

2. 자주 등장하는 기술 키워드 추출

3. 교육 관점 분석:
   - ideaTopics: 학생들이 만들려는 프로젝트/아이디어 주제 (예: "채팅앱", "게임", "데이터분석 대시보드")
   - educationNeeds: 학생들이 어려워하거나 교육을 요청하는 영역 (예: "배포 방법을 모름", "비동기 개념 혼란")

4. **사고 의존도(delegation) 분석 — 매우 중요**:
   각 프롬프트에 대해 학생이 자신의 사고를 얼마나 활용하는지 1~5로 채점:
   - 1(자립형): 자신의 가설/시도/분석 + 구체적 질문. 예) "X로 접근했는데 Y가 문제일까요?"
   - 2(협업형): 맥락·제약·목표 명시 + 조언/비교 요청. 예) "A와 B 중 어떤 게 좋을까요? 이유는?"
   - 3(질문형): 개념·문법 이해를 위한 질문. 중립적
   - 4(의존형): 맥락 부족, "그냥 고쳐줘" 류, 에러 복붙만 + 자신의 시도 無
   - 5(외주형): 과제 전체 일괄 요청, "다 해줘/전부 만들어줘", 목표·제약·의도 누락

   그리고 4~5점 프롬프트는 antiPattern 라벨을 하나 붙이세요 (아래는 예시이며, 더 적절한 라벨이 있다면 자율적으로 추가해도 좋음. 단, 의미가 비슷하면 기존 라벨을 재사용):
   - "맥락없는 일괄요청": 과제/기능 전체를 통째로 요청
   - "에러 복붙 의존": 에러메시지만 붙이고 자신의 가설/시도 無
   - "목표·의도 누락": 무엇을 왜 만드는지 설명 없이 결과물만 요구
   - "사고 없는 복사요청": "코드 알려줘/짜줘"만 반복, 이해 의도 無
   - "검색가능 기초반복": 1분 검색으로 해결될 문법 반복 질문

   **주의**: 아래 "보안 위험" 유형은 antiPattern이 아니라 별도 securityRisk 필드에 분리하세요.

5. **securityRisk (보안 위험 프롬프트 분리)**:
   프롬프트에 민감정보가 포함되거나 보안상 위험한 행동이 관찰되면 antiPattern 대신 securityRisk 필드에 라벨을 붙이세요.
   예시 라벨(자율 추가 가능):
   - "자격증명 노출": Access Key, Secret Key, 비밀번호 등 원문 포함
   - "민감정보 노출": IAM 사용자명/계정ID/이메일/내부경로 등 원문 포함
   - "API 토큰/시크릿 노출": API 키, JWT, 토큰 원문 포함
   - "개인정보 노출": 학생 이름/학번/전화번호 원문 포함
   - "취약한 구성 요청": 모든 권한 허용, public 버킷, 0.0.0.0/0 등 명시적 요청

   exampleAnonSec: 보안 위험 프롬프트는 반드시 **마스킹된** 60자 이내 예시.
   예) "AKIA[***] Access Key 그대로 붙여넣고 '동작 확인해줘'"
   절대 실제 자격증명/토큰 원문을 출력하지 마세요. 모두 [***]로 마스킹.

   **exampleAnon (의존 패턴용)**: 4~5점 프롬프트는 익명화된 짧은 요약을 exampleAnon으로 작성하세요.
   - 최대 60자, 따옴표로 감싸기
   - 이름/학번/이메일/IP/경로/토큰/키는 반드시 [이름], [학번], [경로], [토큰] 등으로 마스킹
   - 원문을 그대로 복붙하지 말고 **의미 중심으로 요약** (예: "에러메시지만 붙이고 '고쳐줘'")
   - 학생을 비판하지 않는 중립적 톤

6. **goodPattern (잘한 패턴 — 사고력 확장형)**:
   1~2점 프롬프트 중 특히 모범적인 것은 goodPattern 라벨을 붙이세요. 아래는 예시이며, 더 적절한 라벨이 있다면 자율 추가 가능:
   - "가설 제시형": "X로 접근했는데 Y가 문제일까요?" 처럼 자신의 가설/추론 제시
   - "맥락 제공형": 목표·입력·제약·현재 상황을 명시하고 조언 요청
   - "트레이드오프 비교형": A vs B 비교, 선택 근거 요청
   - "개념 이해형": 왜 그런지 원리·근거를 묻는 질문
   - "검증 요청형": 자신의 결과물을 리뷰/검증해달라고 요청
   - "제약 명세형": 조건·요구사항을 명확히 서술

   exampleAnonGood: 잘한 프롬프트 예시도 익명화·60자 이내로. 같은 마스킹 규칙.
   모든 1~2점에 라벨 붙일 필요는 없고, **정말 모범적인 경우만** 선별.

JSON으로만 응답:
{
  "classifications": [
    {"id": 1, "category": "디버깅", "delegation": 4, "antiPattern": "에러 복붙 의존", "exampleAnon": "TypeError 스택만 붙이고 '해결해줘'"},
    {"id": 2, "category": "디버깅", "delegation": 1, "goodPattern": "가설 제시형", "exampleAnonGood": "'useEffect가 2번 호출되는데 StrictMode 때문일까요?'"},
    {"id": 3, "category": "코드생성", "delegation": 5, "antiPattern": "맥락없는 일괄요청", "exampleAnon": "'[과제명] 전체 코드 다 짜줘' 한 줄"},
    {"id": 4, "category": "설명요청", "delegation": 2, "goodPattern": "트레이드오프 비교형", "exampleAnonGood": "'SSR vs CSR 중 SEO 관점에서 무엇이 유리한가'"},
    {"id": 5, "category": "디버깅", "delegation": 4, "securityRisk": "자격증명 노출", "exampleAnonSec": "AKIA[***] Access Key와 Secret 붙여넣고 '동작 확인'"}
  ],
  "keywords": ["React", ...],
  "ideaTopics": ["채팅앱", ...],
  "educationNeeds": ["비동기 개념 이해 부족", ...],
  "educationSuggestions": ["가설 기반 디버깅 훈련", ...]
}

educationSuggestions 규칙: 각 항목은 20자 이내 짧은 라벨만. "**제목**: 설명" 같은 형식 금지. 마크다운 기호(**, ##, -, *, 백틱) 전혀 사용 금지.
개별 학생이 식별되는 이름/ID는 절대 포함하지 마세요. exampleAnon/exampleAnonSec 모두 식별정보·자격증명 원문 금지.

프롬프트:
${numbered}`,
      8192,
    );

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const c of parsed.classifications ?? []) {
          categories[c.category] = (categories[c.category] ?? 0) + 1;
          if (typeof c.delegation === "number" && c.delegation >= 1 && c.delegation <= 5) {
            const key = String(c.delegation);
            delegationDist[key] = (delegationDist[key] ?? 0) + 1;
          }
          if (c.antiPattern && typeof c.antiPattern === "string") {
            antiPatternMap[c.antiPattern] = (antiPatternMap[c.antiPattern] ?? 0) + 1;
            if (typeof c.exampleAnon === "string" && c.exampleAnon.trim().length > 0) {
              const trimmed = c.exampleAnon.trim().slice(0, 80);
              if (!antiPatternExamples[c.antiPattern]) antiPatternExamples[c.antiPattern] = [];
              if (antiPatternExamples[c.antiPattern].length < 6 &&
                  !antiPatternExamples[c.antiPattern].includes(trimmed)) {
                antiPatternExamples[c.antiPattern].push(trimmed);
              }
            }
          }
          if (c.goodPattern && typeof c.goodPattern === "string") {
            goodPatternMap[c.goodPattern] = (goodPatternMap[c.goodPattern] ?? 0) + 1;
            if (typeof c.exampleAnonGood === "string" && c.exampleAnonGood.trim().length > 0) {
              const trimmed = c.exampleAnonGood.trim().slice(0, 80);
              if (!goodPatternExamples[c.goodPattern]) goodPatternExamples[c.goodPattern] = [];
              if (goodPatternExamples[c.goodPattern].length < 6 &&
                  !goodPatternExamples[c.goodPattern].includes(trimmed)) {
                goodPatternExamples[c.goodPattern].push(trimmed);
              }
            }
          }
          if (c.securityRisk && typeof c.securityRisk === "string") {
            securityRiskMap[c.securityRisk] = (securityRiskMap[c.securityRisk] ?? 0) + 1;
            if (typeof c.exampleAnonSec === "string" && c.exampleAnonSec.trim().length > 0) {
              const trimmed = c.exampleAnonSec.trim().slice(0, 80);
              if (!securityRiskExamples[c.securityRisk]) securityRiskExamples[c.securityRisk] = [];
              if (securityRiskExamples[c.securityRisk].length < 6 &&
                  !securityRiskExamples[c.securityRisk].includes(trimmed)) {
                securityRiskExamples[c.securityRisk].push(trimmed);
              }
            }
          }
        }
        for (const kw of parsed.keywords ?? []) {
          keywordMap[kw] = (keywordMap[kw] ?? 0) + 1;
        }
        for (const idea of parsed.ideaTopics ?? []) {
          ideaMap[idea] = (ideaMap[idea] ?? 0) + 1;
        }
        for (const need of parsed.educationNeeds ?? []) {
          needsMap[need] = (needsMap[need] ?? 0) + 1;
        }
        for (const s of parsed.educationSuggestions ?? []) {
          suggestionMap[s] = (suggestionMap[s] ?? 0) + 1;
        }
      }
    } catch (err) {
      console.warn("[Analyzer] 분류 파싱 실패, 건너뜀:", err instanceof Error ? err.message : err);
      console.warn("[Analyzer] 응답 앞 500자:", result.slice(0, 500));
      console.warn("[Analyzer] 응답 뒤 300자:", result.slice(-300));
    }
  }

  // 키워드를 빈도순으로 정렬, 상위 20개
  const keywords = Object.entries(keywordMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([kw]) => kw);

  const ideaTopics = Object.entries(ideaMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t]) => t);
  const educationNeeds = Object.entries(needsMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([n]) => n);
  const antiPatterns = Object.entries(antiPatternMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      examples: (antiPatternExamples[label] ?? []).slice(0, 3),
    }));
  const goodPatterns = Object.entries(goodPatternMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      examples: (goodPatternExamples[label] ?? []).slice(0, 3),
    }));
  const securityRisks = Object.entries(securityRiskMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      examples: (securityRiskExamples[label] ?? []).slice(0, 3),
    }));
  const educationSuggestions = Object.entries(suggestionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s]) => s);

  return {
    categories,
    keywords,
    ideaTopics,
    educationNeeds,
    delegationDist,
    goodPatterns,
    antiPatterns,
    securityRisks,
    educationSuggestions,
  };
}

async function generateInsight(
  categories: Record<string, number>,
  keywords: string[],
  ideaTopics: string[],
  educationNeeds: string[],
  delegationDist: Record<string, number>,
  goodPatterns: { label: string; count: number; examples?: string[] }[],
  antiPatterns: { label: string; count: number; examples?: string[] }[],
  securityRisks: { label: string; count: number; examples?: string[] }[],
  educationSuggestions: string[],
  messageCount: number,
  weekStart: string,
  weekEnd: string,
): Promise<string> {
  const catSummary = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${cat}: ${count}건 (${Math.round((count / Object.values(categories).reduce((s, c) => s + c, 0)) * 100)}%)`)
    .join(", ");

  const delegationTotal = Object.values(delegationDist).reduce((s, c) => s + c, 0);
  const delegationSummary = delegationTotal > 0
    ? Object.entries(delegationDist)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([k, v]) => `${DELEGATION_LABELS[k] ?? k}(${k}): ${Math.round((v / delegationTotal) * 100)}%`)
        .join(", ")
    : "데이터 부족";

  const antiSummary = antiPatterns.length > 0
    ? antiPatterns.map((p) => `${p.label}(${p.count}건)`).join(", ")
    : "뚜렷한 의존 패턴 없음";

  const goodSummary = goodPatterns.length > 0
    ? goodPatterns.map((p) => `${p.label}(${p.count}건)`).join(", ")
    : "특별히 돋보이는 모범 패턴 미관찰";

  const securitySummary = securityRisks.length > 0
    ? securityRisks.map((r) => `${r.label}(${r.count}건)`).join(", ")
    : "관찰되지 않음";

  return invokeModel(
    SONNET_MODEL,
    `다음은 ${weekStart}~${weekEnd} 주간 학생들의 AI 코딩 도구 사용 분석 결과입니다.

총 분석 메시지: ${messageCount}건 (샘플링)
프롬프트 카테고리 분포: ${catSummary}
자주 등장한 기술 키워드: ${keywords.join(", ")}
학생 프로젝트 아이디어 주제: ${ideaTopics.join(", ") || "파악 안됨"}
교육 필요 영역: ${educationNeeds.join(", ") || "파악 안됨"}

[사고 의존도 분석]
의존도 분포 (1=자립형~5=외주형): ${delegationSummary}
주요 의존 패턴: ${antiSummary}
잘한 패턴 (모범적 프롬프트): ${goodSummary}

[보안 위험 프롬프트]
관찰된 유형: ${securitySummary}

AI가 제안한 교육 주제: ${educationSuggestions.join(", ") || "없음"}

교육 관리자에게 전달할 주간 인사이트 리포트를 한국어로 작성하세요. 6~9개 문단으로:
1. 이번 주 학생들의 AI 활용 패턴 요약
2. 학생들이 가장 많이 도움을 요청하는 영역
3. 주목할 만한 프로젝트 아이디어 동향
4. 학생들이 어려워하는 부분 — 교육이 필요한 영역
5. 주목할 만한 기술 키워드/트렌드
6. AI 활용 성숙도 — 사고력 개발 관점: 의존도 분포가 의미하는 바, 학생들이 AI를 사고의 확장 도구로 쓰고 있는지 vs 사고를 외주화하고 있는지. 구체적 비율을 언급하며 판단. 모범적 패턴(goodPatterns)이 있다면 긍정적으로 언급하여 균형 잡힌 시각 제공.
7. 사고력 개발을 위한 교육 제안: 관찰된 의존 패턴을 개선할 구체적 워크숍/실습 주제. "프롬프트 리프레이밍", "가설 기반 디버깅" 같은 실용적 제안. 단, 학생을 탓하는 어조가 아닌 "이런 기회가 있다"는 성장 관점으로 서술.
8. 보안 위험 프롬프트 관찰 사항 (보안 위험이 있을 때만 포함): 자격증명/민감정보 노출 패턴 언급, 보안 교육의 긴급성 강조. 없으면 이 문단 생략.
9. 교수님께 제안하는 전반적 교육 방향과 프롬프트 활용 가이드

톤: 학생 비판이 아닌 교육 기회 발견. "나쁜"보다 "성장 여지", "의존"보다 "자립도 향상" 표현 권장.
중요: 평문 문장만 작성. 마크다운 기호(**, ##, -, *, 백틱 등) 절대 사용 금지. 강조가 필요하면 따옴표나 문장 구조로 표현.`,
  );
}

export async function runWeeklyAnalysis(
  prisma: PrismaClient,
  bucket: string,
  accountId: string,
  region: string,
  weekStart?: string,
  weekEnd?: string,
): Promise<void> {
  // 기본: 지난주
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const start = weekStart ?? lastMonday.toISOString().slice(0, 10);
  const end = weekEnd ?? lastSunday.toISOString().slice(0, 10);

  // 이미 분석된 주인지 확인
  const existing = await prisma.weeklyReport.findFirst({
    where: { weekStart: start, groupCode: null },
  });
  if (existing) {
    console.log(`[Analyzer] ${start}~${end} 이미 분석됨, 건너뜀`);
    return;
  }

  console.log(`[Analyzer] ${start}~${end} 분석 시작`);

  // 1. 프롬프트 수집 (샘플링)
  const prompts = await collectPrompts(bucket, accountId, region, start, end);
  console.log(`[Analyzer] ${prompts.length}개 프롬프트 수집 완료`);

  if (prompts.length === 0) {
    console.log("[Analyzer] 프롬프트 없음, 건너뜀");
    return;
  }

  // 2. Haiku로 분류
  console.log("[Analyzer] Haiku 분류 시작...");
  const {
    categories,
    keywords,
    ideaTopics,
    educationNeeds,
    delegationDist,
    goodPatterns,
    antiPatterns,
    securityRisks,
    educationSuggestions,
  } = await classifyBatch(prompts);
  console.log("[Analyzer] 분류 완료:", categories);
  console.log("[Analyzer] 아이디어:", ideaTopics);
  console.log("[Analyzer] 교육필요:", educationNeeds);
  console.log("[Analyzer] 의존도 분포:", delegationDist);
  console.log("[Analyzer] 잘한 패턴:", goodPatterns);
  console.log("[Analyzer] 의존 패턴:", antiPatterns);
  console.log("[Analyzer] 보안 위험:", securityRisks);

  // 3. Sonnet으로 인사이트 생성
  console.log("[Analyzer] Sonnet 인사이트 생성...");
  const insights = await generateInsight(
    categories,
    keywords,
    ideaTopics,
    educationNeeds,
    delegationDist,
    goodPatterns,
    antiPatterns,
    securityRisks,
    educationSuggestions,
    prompts.length,
    start,
    end,
  );
  console.log("[Analyzer] 인사이트 생성 완료");

  // 4. DB 저장 (categories JSON에 확장 필드 포함 — 스키마 변경 없이 확장)
  await prisma.weeklyReport.create({
    data: {
      weekStart: start,
      weekEnd: end,
      groupCode: null,
      messageCount: prompts.length,
      categories: {
        ...categories,
        _ideaTopics: ideaTopics,
        _educationNeeds: educationNeeds,
        _delegationDist: delegationDist,
        _goodPatterns: goodPatterns,
        _antiPatterns: antiPatterns,
        _securityRisks: securityRisks,
        _educationSuggestions: educationSuggestions,
      },
      keywords,
      insights,
    },
  });

  console.log(`[Analyzer] ${start}~${end} 저장 완료`);
}
