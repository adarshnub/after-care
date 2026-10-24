import { test, expect, type APIRequestContext } from "@playwright/test";
import { addDays, dateInZone } from "../src/lib/schedule";
import type { CareRecord, Workspace } from "../src/lib/types";

async function demo(request: APIRequestContext, role: string) {
  const r = await request.post("/api/auth/demo", { data: { role } });
  expect(r.status()).toBe(200);
}

test("API authentication, role checks, cross-origin protection, and PWA resources", async ({
  request,
}) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/staff", {
        data: { name: "QA nurse", email: "qa@example.com" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/auth/demo", {
        headers: { Origin: "https://unrelated.example" },
        data: { role: "nurse" },
      })
    ).status(),
  ).toBe(403);
  await demo(request, "patient");
  expect((await request.post("/api/discharges", { data: {} })).status()).toBe(
    403,
  );
  expect(
    (
      await request.post("/api/organize", {
        data: { notes: "Test instruction" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/discharges/unknown/complete", {
        data: { taskId: "task-1", date: "2026-10-24" },
      })
    ).status(),
  ).toBe(404);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const file of [
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable.png",
    "/sw.js",
    "/offline.html",
    "/fonts/inter.woff2",
  ])
    expect((await request.get(file)).status()).toBe(200);
  expect((await (await request.get("/api/workspace")).json()).viewer.role).toBe(
    "patient",
  );
});

test("nurse creates a reviewed plan; both issued accounts see only their patient and share one check-off", async ({
  page,
  browser,
}) => {
  const suffix = Date.now().toString(),
    name = `QA Patient ${suffix}`;
  const today = dateInZone(new Date(), "Asia/Kolkata"),
    end = addDays(today, 7);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One day at a time, Alex." }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Switch demo view" })
    .selectOption("nurse");
  await expect(
    page.getByRole("heading", {
      name: "Care that continues beyond discharge.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New discharge", exact: true })
    .first()
    .click();
  await page.getByLabel("Patient’s full name").fill(name);
  await page
    .getByLabel("Patient’s email", { exact: true })
    .fill(`qa-patient-${suffix}@example.com`);
  await page
    .getByLabel("Discharge diagnosis / procedure")
    .fill("Fictional QA recovery");
  await page.getByLabel("Caregiver’s full name").fill("QA Caregiver");
  await page
    .getByLabel("Caregiver’s email")
    .fill(`qa-caregiver-${suffix}@example.com`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Discharge instructions", { exact: true })
    .fill(
      `Summary: Fictional QA care plan.\nMedication: QA medicine | 1 test unit | 1 | 12 | 08:00,20:00 | Fictional test only | ${end}\nCare: QA dressing check | 18:00 | Fictional care instruction | ${end}\nFollow-up: QA follow-up | QA clinician | ${end} | 10:30 | Test clinic | Bring test summary\nGeneral: Use this plan only for testing.\nWarning: This is a fictional test record.`,
    );
  await page.getByRole("button", { name: "Organize & review" }).click();
  await expect(
    page.getByRole("heading", { name: "Daily reminders" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve & create access" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /I have checked this plan/ })
    .check();
  await page.getByRole("button", { name: "Approve & create access" }).click();
  await expect(
    page.getByRole("heading", { name: `${name}’s care plan is ready.` }),
  ).toBeVisible();
  const boxes = page.locator(".credential-box");
  const patientEmail = await boxes.nth(0).locator("dd").nth(0).innerText(),
    patientPassword = await boxes.nth(0).locator("dd").nth(1).innerText();
  const caregiverEmail = await boxes.nth(1).locator("dd").nth(0).innerText(),
    caregiverPassword = await boxes.nth(1).locator("dd").nth(1).innerText();
  const patientContext = await browser.newContext(),
    caregiverContext = await browser.newContext();
  try {
    const patient = await patientContext.newPage();
    await patient.goto("/login");
    await patient.getByLabel("Email address").fill(patientEmail);
    await patient.getByLabel("Password", { exact: true }).fill(patientPassword);
    await patient.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      patient.getByRole("heading", { name: "One day at a time, QA." }),
    ).toBeVisible();
    const ws: Workspace = await (
      await patientContext.request.get("/api/workspace")
    ).json();
    expect(ws.records).toHaveLength(1);
    expect(ws.records[0].name).toBe(name);
    const record: CareRecord = ws.records[0];
    expect(
      (
        await patientContext.request.post(
          "/api/discharges/demo-alex/complete",
          { data: { taskId: "task-1", date: today } },
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await patientContext.request.post(
          `/api/discharges/${record.id}/complete`,
          {
            data: { taskId: record.plan.tasks[0].id, date: addDays(today, 1) },
          },
        )
      ).status(),
    ).toBe(400);
    await patient
      .getByRole("button", { name: "Mark as taken", exact: true })
      .first()
      .click();
    await patient
      .getByRole("button", { name: "Confirm taken", exact: true })
      .click();
    await expect(patient.getByText("1 of 3 tasks complete")).toBeVisible();
    await patientContext.request.post(`/api/discharges/${record.id}/complete`, {
      data: { taskId: record.plan.tasks[0].id, date: today },
    });
    const updated: Workspace = await (
      await patientContext.request.get("/api/workspace")
    ).json();
    expect(
      updated.records[0].completions.filter(
        (c) => c.taskId === record.plan.tasks[0].id,
      ),
    ).toHaveLength(1);
    const caregiver = await caregiverContext.newPage();
    await caregiver.goto("/login");
    await caregiver.getByLabel("Email address").fill(caregiverEmail);
    await caregiver
      .getByLabel("Password", { exact: true })
      .fill(caregiverPassword);
    await caregiver
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(caregiver.getByText("1 of 3 tasks complete")).toBeVisible();
    const cg: Workspace = await (
      await caregiverContext.request.get("/api/workspace")
    ).json();
    expect(cg.viewer.role).toBe("caregiver");
    expect(cg.records).toHaveLength(1);
    await patient
      .getByRole("button", { name: "Medications", exact: true })
      .click();
    await patient
      .getByRole("button", { name: "Record a refill", exact: true })
      .click();
    await patient.getByLabel("Quantity received").fill("10");
    await patient
      .getByRole("button", { name: "Record medication received", exact: true })
      .click();
    await expect(
      patient.getByText("21 units remaining", { exact: true }),
    ).toBeVisible();
    const requestId = crypto.randomUUID();
    for (let i = 0; i < 2; i++)
      expect(
        (
          await caregiverContext.request.post(
            `/api/discharges/${record.id}/refill`,
            {
              data: {
                requestId,
                medicationId: record.plan.medications[0].id,
                quantity: 5,
              },
            },
          )
        ).status(),
      ).toBe(200);
    const afterRefill: Workspace = await (
      await caregiverContext.request.get("/api/workspace")
    ).json();
    expect(afterRefill.records[0].refills).toHaveLength(2);
    await patient
      .getByRole("button", { name: "Appointments", exact: true })
      .click();
    const downloadPromise = patient.waitForEvent("download");
    await patient.getByRole("button", { name: "Add to calendar" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe(
      "aftercare-appointment.ics",
    );
    await patient
      .getByRole("button", { name: "Care assistant", exact: true })
      .click();
    await patient
      .getByRole("button", { name: "Help with my medications", exact: true })
      .click();
    await expect(patient.locator(".chat-bubble").last()).toContainText(
      "QA medicine",
    );
    await expect(patient.locator(".assistant-mode")).toContainText(
      "AI not connected",
    );
    await patient
      .getByRole("textbox", { name: "Ask about your care plan" })
      .fill("I have chest pain");
    await patient.getByRole("button", { name: "Send message" }).click();
    await expect(patient.locator(".chat-bubble").last()).toContainText(
      "Contact your local emergency service now",
    );
    await patient.getByRole("button", { name: /QA Patient.*Patient/ }).click();
    await patient
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await expect(
      patient.getByRole("heading", { name: "A little support starts here." }),
    ).toBeVisible();
    expect((await patientContext.request.get("/api/workspace")).status()).toBe(
      401,
    );
  } finally {
    await patientContext.close();
    await caregiverContext.close();
  }
});

test("mobile navigation, assistant, notification setup status, and offline recovery", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One day at a time, Alex." }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Medications", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little clarity with every dose." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Paracetamol", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View reminders and notification settings" })
    .click();
  await expect(
    page.getByText("Setup pending · In-app reminders are available below."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Background notifications will be available",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "One day at a time, Alex." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little pause in connection." }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "One day at a time, Alex." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
