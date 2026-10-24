import { test } from "node:test";
import assert from "node:assert/strict";
import { deploymentIssues, deploymentOrigins, localDemoEnabled } from "../src/lib/deployment";

const hosted = {
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_URL: "after-care-abc123.example.vercel.app",
  VERCEL_PROJECT_PRODUCTION_URL: "after-care.example.vercel.app",
  SUPABASE_URL: "https://fictional.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "fictional-test-value",
};

test("hosted deployments cannot enable the local demo file store", () => {
  assert.equal(localDemoEnabled({ NODE_ENV: "development" }), true);
  assert.equal(localDemoEnabled({ NODE_ENV: "production" }), false);
  assert.equal(localDemoEnabled({ VERCEL: "1", ALLOW_DEMO: "true" }), false);
  assert.equal(localDemoEnabled({ NODE_ENV: "development", SUPABASE_URL: "configured" }), false);
});

test("production and preview origins are scoped to configured deployment domains", () => {
  assert.deepEqual(deploymentOrigins(hosted), [
    "https://after-care-abc123.example.vercel.app",
    "https://after-care.example.vercel.app",
  ]);
  assert.deepEqual(deploymentOrigins({
    ...hosted,
    VERCEL_ENV: "preview",
    VERCEL_BRANCH_URL: "after-care-git-test.example.vercel.app",
  }), [
    "https://after-care-abc123.example.vercel.app",
    "https://after-care-git-test.example.vercel.app",
  ]);
  assert.deepEqual(deploymentOrigins({ ...hosted, APP_URL: "https://care.example.org/" }), [
    "https://care.example.org",
    "https://after-care-abc123.example.vercel.app",
    "https://after-care.example.vercel.app",
  ]);
  assert.deepEqual(deploymentOrigins({}), []);
});

test("deployment requires Supabase and rejects localhost, unsafe URL settings, and demo mode", () => {
  assert.deepEqual(deploymentIssues(hosted).errors, []);
  assert.ok(deploymentIssues({}).errors.some((e) => e.includes("SUPABASE_SERVICE_ROLE_KEY")));
  for (const url of ["http://localhost:3000", "https://care.example.org/path", "https://user:password@care.example.org", "invalid"]) {
    assert.ok(deploymentIssues({ ...hosted, APP_URL: url }).errors.some((e) => e.includes("APP_URL")));
  }
  assert.ok(deploymentIssues({ ...hosted, ALLOW_DEMO: "true" }).errors.length);
});

test("partial push configuration fails clearly while a keyless deployment allows manual workflows", () => {
  const unconfigured = deploymentIssues(hosted);
  assert.equal(unconfigured.errors.length, 0);
  assert.ok(unconfigured.warnings.some((e) => e.includes("Web Push")));
  const partial = deploymentIssues({ ...hosted, VAPID_PUBLIC_KEY: "invalid" });
  for (const key of ["VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET"]) {
    assert.ok(partial.errors.some((e) => e.includes(key)));
  }
  const push = {
    ...hosted,
    VAPID_PUBLIC_KEY: "A".repeat(87),
    VAPID_PRIVATE_KEY: "B".repeat(43),
    VAPID_SUBJECT: "mailto:care@example.org",
    CRON_SECRET: "C".repeat(43),
  };
  assert.deepEqual(deploymentIssues(push).errors, []);
  assert.ok(deploymentIssues({ ...push, CRON_SECRET: "short" }).errors.length);
});
