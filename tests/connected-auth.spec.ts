import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("connected Supabase session refresh keeps server database authorization", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.AFTERCARE_LIVE_TESTS !== "true",
    "Opt in with AFTERCARE_LIVE_TESTS=true against the connected local app.",
  );
  const contents = await readFile(
    process.env.NURSE_ACCESS_FILE ||
      path.join(process.cwd(), ".data/nurse-access.txt"),
    "utf8",
  );
  const email = contents.match(/^Email: (.+)$/m)?.[1].trim();
  const password = contents.match(/^Password: (.+)$/m)?.[1].trim();
  if (!email || !password)
    throw new Error(
      "The local nurse access file does not contain usable credentials.",
    );
  const context = await browser.newContext({ baseURL });
  try {
    const login = await context.request.post("/api/auth/login", {
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    const initial = await (await context.request.get("/api/workspace")).json();
    expect(initial.viewer.role).toBe("nurse");
    expect(initial.viewer.demo).toBe(false);
    expect(
      (await context.cookies()).some((cookie) => cookie.name === "ac-refresh"),
    ).toBe(true);
    await context.clearCookies({ name: "ac-access" });
    const refreshed = await context.request.get("/api/workspace");
    expect(refreshed.status()).toBe(200);
    const workspace = await refreshed.json();
    expect(workspace.viewer.id).toBe(initial.viewer.id);
    expect(
      (await context.cookies()).some((cookie) => cookie.name === "ac-access"),
    ).toBe(true);
  } finally {
    await context.request.post("/api/auth/logout", { data: {} });
    await context.close();
  }
});
