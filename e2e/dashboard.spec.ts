import { test, expect } from "@playwright/test";

test.describe("대시보드", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill("admin@example.com");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("대시보드 페이지 KPI 카드 렌더링", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

    // KPI 카드들이 렌더링되는지 확인 (데이터 없어도 카드 자체는 보여야 함)
    await expect(page.getByText("총 메시지")).toBeVisible();
    await expect(page.getByText("활성 사용자")).toBeVisible();
    await expect(page.getByText("피크 시간")).toBeVisible();
    await expect(page.getByText("일평균 메시지")).toBeVisible();
  });

  test("날짜 범위 선택기 동작", async ({ page }) => {
    await expect(page.getByLabel("시작일")).toBeVisible();
    await expect(page.getByLabel("종료일")).toBeVisible();
  });

  test("차트 영역 렌더링", async ({ page }) => {
    await expect(page.getByText("일별 사용 트렌드")).toBeVisible();
    await expect(page.getByText(/시간대별 분포/)).toBeVisible();
  });

  test("사용량 페이지 네비게이션", async ({ page }) => {
    await page.getByRole("link", { name: /사용량/ }).click();
    await expect(page.getByRole("heading", { name: "사용량 분석" })).toBeVisible();

    // 탭 확인
    await expect(page.getByRole("tab", { name: "일별 추이" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "시간대별" })).toBeVisible();
  });

  test("사용량 탭 전환", async ({ page }) => {
    await page.getByRole("link", { name: /사용량/ }).click();
    await expect(page.getByRole("heading", { name: "사용량 분석" })).toBeVisible();

    // 시간대별 탭 클릭
    await page.getByRole("tab", { name: "시간대별" }).click();
    await expect(page.getByLabel("날짜 선택")).toBeVisible();
  });

  test("summary API 응답 확인", async ({ request }) => {
    // 먼저 로그인 토큰 획득
    const loginRes = await request.post("/api/auth/login", {
      data: { username: "admin", password: "admin1234" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // 쿠키로 summary API 호출
    const summaryRes = await request.get("/api/dashboard/summary");
    expect(summaryRes.ok()).toBeTruthy();

    const data = await summaryRes.json();
    expect(data).toHaveProperty("totalMessages");
    expect(data).toHaveProperty("activeUsers");
    expect(data).toHaveProperty("utilizationRate");
  });
});
