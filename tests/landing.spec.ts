import { test, expect } from "@playwright/test";

test("public landing: roles, keyboard tabs, screenshot preview, motion, and app links", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(
    "After Care — A little care. A better tomorrow.",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A little care.A better tomorrow.",
  );
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute("href", "/login");
  await expect(
    page.getByRole("link", { name: "Watch the story" }),
  ).toHaveAttribute("href", "/present");
  await page.getByRole("button", { name: "Pause animations" }).click();
  await expect(page.locator(".marketing")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await page.getByRole("tab", { name: "For caregivers" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("In their corner.");
  await page.getByRole("tab", { name: "For caregivers" }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "For nurses" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Create patient and caregiver access",
  );
  await page.getByRole("tab", { name: "For nurses" }).press("Home");
  await expect(page.getByRole("tabpanel")).toContainText("Your next step,");
  await page
    .getByRole("button", { name: "Preview medication supply screenshot" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "fictional demonstration record",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Open After Care", exact: true }),
  ).toHaveAttribute("href", "/workspace");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/workspace");
  expect(errors).toEqual([]);
});

test("mobile landing remains readable, navigates, and respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play animations" }),
  ).toBeAttached();
  await expect(page.locator(".marketing")).toHaveAttribute(
    "data-motion",
    "off",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Open site navigation" }).click();
  await page
    .getByRole("link", { name: "Explore the app", exact: true })
    .click();
  await expect(page).toHaveURL(/#experience$/);
  await expect(
    page.getByRole("navigation", { name: "Site navigation" }),
  ).toBeHidden();
  await page.getByRole("tab", { name: "For nurses" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Your knowledge.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("presentation advances by keyboard and controls, exposes notes, and links to the workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/present");
  await expect(
    page.getByRole("group", { name: "Slide 1 of 6", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous slide" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Next slide" })).toBeEnabled();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("group", { name: "Slide 2 of 6", exact: true }),
  ).toBeVisible();
  const reviewImage = page.getByAltText(
    "Nurse review screen with an AI-organized draft and a clarification",
  );
  await expect
    .poll(() => reviewImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
    .toBe(true);
  await page.getByRole("button", { name: "Show speaker notes" }).click();
  await expect(
    page.getByRole("complementary", { name: "Speaker notes" }),
  ).toContainText("organizes rather than prescribes");
  await page.getByRole("button", { name: "Next slide" }).click();
  await expect(
    page.getByRole("group", { name: "Slide 3 of 6", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("button", { name: "Next slide" })).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Open After Care", exact: true }),
  ).toHaveAttribute("href", "/workspace");
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("group", { name: "Slide 1 of 6", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(errors).toEqual([]);
});
