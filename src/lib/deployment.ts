// Pure configuration helpers shared by the server, deployment check, and tests.
type Environment = Readonly<Record<string, string | undefined>>;

export function localDemoEnabled(env: Environment) {
  return (
    env.VERCEL !== "1" &&
    !env.SUPABASE_URL &&
    !env.SUPABASE_SERVICE_ROLE_KEY &&
    (env.ALLOW_DEMO === "true" || env.NODE_ENV === "development")
  );
}

export function deploymentOrigins(env: Environment): string[] {
  const origins = env.APP_URL ? [new URL(env.APP_URL).origin] : [];
  if (env.VERCEL === "1") {
    for (const domain of [
      env.VERCEL_URL,
      env.VERCEL_BRANCH_URL,
      ...(env.VERCEL_ENV === "production"
        ? [env.VERCEL_PROJECT_PRODUCTION_URL]
        : []),
    ]) {
      if (domain) origins.push(new URL(`https://${domain}`).origin);
    }
  }
  return [...new Set(origins)];
}

export function deploymentIssues(env: Environment) {
  const errors: string[] = [], warnings: string[] = [];
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[key]?.trim()) errors.push(`Set ${key} in Vercel Environment Variables.`);
  }
  for (const key of ["APP_URL", "SUPABASE_URL"]) {
    if (!env[key]) continue;
    try {
      const url = new URL(env[key]);
      if (
        url.protocol !== "https:" || url.username || url.password ||
        url.search || url.hash || url.pathname !== "/" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ) throw new Error("Invalid deployment URL");
    } catch {
      errors.push(`${key} must be a public HTTPS origin with no path or credentials.`);
    }
  }
  if (!env.APP_URL && !(env.VERCEL === "1" && env.VERCEL_URL)) {
    errors.push("Set APP_URL, or enable Vercel system environment variables for automatic domains.");
  }
  if (env.ALLOW_DEMO === "true") {
    errors.push("Set ALLOW_DEMO=false or remove it. The local file store cannot run on Vercel.");
  }
  if (!env.OPENAI_API_KEY) warnings.push("OpenAI is not configured; manual care-plan entry remains available.");
  const pushKeys = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
  const hasKeyPair = Boolean(env.VAPID_PUBLIC_KEY || env.VAPID_PRIVATE_KEY);
  if (hasKeyPair) {
    for (const key of [...pushKeys, "CRON_SECRET"]) {
      if (!env[key]) errors.push(`Set ${key} to complete background reminder configuration.`);
    }
    if (env.VAPID_PUBLIC_KEY && !/^[A-Za-z0-9_-]{87}$/.test(env.VAPID_PUBLIC_KEY)) {
      errors.push("VAPID_PUBLIC_KEY must be a generated Web Push public key.");
    }
    if (env.VAPID_PRIVATE_KEY && !/^[A-Za-z0-9_-]{43}$/.test(env.VAPID_PRIVATE_KEY)) {
      errors.push("VAPID_PRIVATE_KEY must be a generated Web Push private key.");
    }
    if (env.VAPID_SUBJECT && !/^(mailto:|https:\/\/)/.test(env.VAPID_SUBJECT)) {
      errors.push("VAPID_SUBJECT must be a mailto: contact or HTTPS URL.");
    }
  } else warnings.push("Web Push is not configured; background notifications are unavailable.");
  if (env.CRON_SECRET && env.CRON_SECRET.length < 32) errors.push("Use a random CRON_SECRET with at least 32 characters.");
  if (env.STAFF_PROVISIONING_SECRET) warnings.push("Nurse provisioning is enabled. Remove STAFF_PROVISIONING_SECRET when finished.");
  return { errors, warnings };
}
