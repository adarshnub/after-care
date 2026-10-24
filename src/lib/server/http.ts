import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { deploymentOrigins } from "@/lib/deployment";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 4)
          .join(" "),
      },
      400,
    );
  if (error instanceof SyntaxError)
    return json({ error: "Please send valid JSON." }, 400);
  console.error(
    "[After Care] Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    { error: "We couldn’t complete that request. Please try again." },
    500,
  );
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const allowed = deploymentOrigins(process.env);
  // Local development can use its request origin. Hosted origins must come
  // from server configuration, never from an arbitrary forwarded Host header.
  if (!allowed.length && process.env.VERCEL !== "1")
    allowed.push(requestUrl.origin);
  if (origin && !allowed.includes(origin))
    throw new HttpError(403, "This request is not allowed.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "This request is not allowed.");
}
export async function body(request: Request) {
  assertOrigin(request);
  if (Number(request.headers.get("content-length") || 0) > 100000)
    throw new HttpError(413, "Request too large.");
  const value = await request.text();
  if (value.length > 100000) throw new HttpError(413, "Request too large.");
  return JSON.parse(value);
}
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max: number, windowMs = 60000) {
  const now = Date.now();
  if (buckets.size > 5000)
    for (const [k, b] of buckets) if (b.until < now) buckets.delete(k);
  if (buckets.size > 5000) buckets.delete(buckets.keys().next().value!);
  const b = buckets.get(key);
  if (!b || b.until < now) {
    buckets.set(key, { count: 1, until: now + windowMs });
    return;
  }
  if (++b.count > max)
    throw new HttpError(429, "Please wait a moment before trying again.");
}
