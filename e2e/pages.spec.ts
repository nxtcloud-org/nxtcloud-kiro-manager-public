import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("admin@example.com");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("페이지 네비게이션", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("크레딧 페이지 렌더링", async ({ page }) => {
    await page.getByRole("link", { name: /크레딧/ }).click();
    await expect(page.getByRole("heading", { name: "크레딧 분석" })).toBeVisible();
    await expect(page.getByText("총 크레딧 사용")).toBeVisible();
    await expect(page.getByText("일별 크레딧 사용 트렌드")).toBeVisible();
    await expect(page.getByText("크레딧 사용 TOP 10")).toBeVisible();
  });

  test("사용자 페이지 렌더링", async ({ page }) => {
    await page.getByRole("link", { name: /사용자/ }).click();
    await expect(page.getByRole("heading", { name: "사용자" })).toBeVisible();
    await expect(page.getByText("사용자 랭킹 (메시지 기준)")).toBeVisible();
  });

  test("그룹 페이지 렌더링", async ({ page }) => {
    await page.getByRole("link", { name: /그룹/ }).click();
    await expect(page.getByRole("heading", { name: "그룹 관리" })).toBeVisible();
    // seed 데이터에 3개 그룹이 있으므로 카드가 보여야 함
    await expect(page.getByText("캡스톤디자인1")).toBeVisible();
    await expect(page.getByText("클라우드컴퓨팅")).toBeVisible();
    await expect(page.getByText("해커톤")).toBeVisible();
  });

  test("팀 페이지 렌더링 + 코스 선택", async ({ page }) => {
    await page.getByRole("link", { name: /팀/ }).click();
    await expect(page.getByRole("heading", { name: "팀 분석" })).toBeVisible();
    await expect(page.getByText("코스를 선택하면")).toBeVisible();

    // 코스 선택기 확인
    await expect(page.getByText("코스를 선택하세요")).toBeVisible();
  });

  test("각 API 엔드포인트 응답 확인", async ({ request }) => {
    // 먼저 로그인
    await request.post("/api/auth/login", {
      data: { username: "admin", password: "admin1234" },
    });

    const endpoints = [
      "/api/credits/summary",
      "/api/credits/daily",
      "/api/credits/users",
      "/api/users/top",
      "/api/groups/stats",
      "/api/teams/courses",
    ];

    for (const endpoint of endpoints) {
      const res = await request.get(endpoint);
      expect(res.ok(), `${endpoint} should return 200`).toBeTruthy();
    }
  });
});
