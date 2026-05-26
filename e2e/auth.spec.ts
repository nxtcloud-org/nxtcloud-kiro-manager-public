import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("admin@example.com");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("인증 플로우", () => {
  test("미인증 시 로그인 페이지로 리다이렉트", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("잘못된 로그인 시 에러 메시지 표시", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("이메일").fill("wrong");
    await page.getByLabel("비밀번호").fill("wrong");
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(
      page.getByText("이메일 또는 비밀번호가 올바르지 않습니다"),
    ).toBeVisible();
  });

  test("정상 로그인 후 대시보드 이동", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  });

  test("로그인 후 사이드바 네비게이션 확인", async ({ page }) => {
    await login(page);

    await expect(page.getByText("KIRO Manager").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /대시보드/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /사용량/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /크레딧/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /사용자/ })).toBeVisible();
  });

  test("로그아웃 후 로그인 페이지로 이동", async ({ page }) => {
    await login(page);

    await page.getByText("관리자").click();
    await page.getByText("로그아웃").click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("health API는 인증 없이 접근 가능", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
