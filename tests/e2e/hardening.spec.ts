import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

test("home, detail, and setup have no serious accessibility violations", async ({
  page,
}) => {
  const reports: Array<{ path: string; violations: unknown[] }> = [];
  for (const path of ["/", "/movies/movie-1", "/setup"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = result.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    );
    reports.push({ path, violations: serious });
    expect(
      serious,
      `${path} serious/critical accessibility violations`,
    ).toEqual([]);
  }
  mkdirSync("artifacts/reports", { recursive: true });
  writeFileSync(
    "artifacts/reports/accessibility.json",
    `${JSON.stringify(reports, null, 2)}\n`,
  );
});

test("final TV screenshot matrix covers every golden surface", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    const size = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.screenshot({
      path: `artifacts/screenshots/final-home-${size}.png`,
    });
    await page.goto("/search");
    await page.screenshot({
      path: `artifacts/screenshots/final-search-${size}.png`,
    });
    await page.goto("/movies/movie-1");
    await page.screenshot({
      path: `artifacts/screenshots/final-detail-${size}.png`,
    });
    await page.getByRole("button", { name: "Смотреть сейчас" }).click();
    const chooser = page.getByRole("dialog", { name: "Выберите версию" });
    await expect(chooser.locator("button.choice").first()).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/final-torrents-${size}.png`,
    });
    await chooser.locator("button.choice").first().click();
    const player = page.getByRole("dialog", { name: "Подготовка просмотра" });
    await expect(player.locator("button.choice").first()).toBeVisible();
    await player.locator("button.choice").first().click();
    await expect(
      page.getByRole("heading", { name: "Готово к просмотру" }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/final-playback-${size}.png`,
    });
    await page.goto("/setup");
    await expect(page.getByText("Режим: mock")).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/final-setup-${size}.png`,
    });
    await page.route("/api/catalog", (route) =>
      route.fulfill({ status: 503, body: "{}" }),
    );
    await page.goto("/");
    await expect(page.getByRole("alert")).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/final-error-${size}.png`,
    });
    await page.unroute("/api/catalog");
  }
});
