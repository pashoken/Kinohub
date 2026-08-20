import { expect, test } from "@playwright/test";

async function openFirstMovie(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Кино для большого экрана" }),
  ).toBeVisible();
  for (let index = 0; index < 5; index += 1) await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "На главную" })).toBeVisible();
}

test("browse → request works with remote-like keyboard input", async ({
  page,
}) => {
  await openFirstMovie(page);
  for (let index = 0; index < 6; index += 1) await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Добавить фильм?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator(":focus")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(/очередь|добавлен/i);
  await page.screenshot({
    path: "artifacts/screenshots/phase7-request-keyboard-1280x720.png",
  });
});

test("browse → watch → choose file works with keyboard input", async ({
  page,
}) => {
  await openFirstMovie(page);
  for (let index = 0; index < 7; index += 1) await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const chooser = page.getByRole("dialog", { name: "Выберите версию" });
  await expect(chooser).toBeVisible();
  await expect(chooser.locator("button.choice").first()).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const player = page.getByRole("dialog", { name: "Подготовка просмотра" });
  await expect(player).toBeVisible();
  await expect(player.locator("button.choice").first()).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Готово к просмотру" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/phase7-playback-keyboard-1280x720.png",
  });
});

test("directional focus, Escape, and PWA shell are projector safe", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).toBeVisible();
  await openFirstMovie(page);
  for (let index = 0; index < 7; index += 1) await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Выберите версию" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Выберите версию" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Смотреть сейчас" }),
  ).toBeFocused();

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBeTruthy();
  expect(await worker.text()).toContain('pathname.startsWith("/api/")');
});

test("horizontal arrows stay inside a rail and scroll it", async ({ page }) => {
  await page.goto("/");
  const rail = page.locator(".rail").first();
  const cards = rail.locator(".card, .show-more-card");
  await cards.first().focus();
  const count = await cards.count();
  for (let index = 1; index < count; index += 1) await page.keyboard.press("ArrowRight");
  await expect(cards.last()).toBeFocused();
  expect(await rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("ArrowRight");
  await expect(cards.last()).toBeFocused();
  await expect(page.locator("header nav a:focus")).toHaveCount(0);
  await expect(page.locator(".brand:focus")).toHaveCount(0);
});

test("vertical arrows move between rails before the fixed header", async ({ page }) => {
  await page.goto("/");
  const rails = page.locator(".catalog-section .rail");
  const firstRailCard = rails.nth(0).locator(".card").first();
  const secondRailCard = rails.nth(1).locator(".card").first();
  await secondRailCard.focus();
  await page.keyboard.press("ArrowUp");
  await expect(firstRailCard).toBeFocused();
  await expect(page.locator("header nav a:focus")).toHaveCount(0);
});
