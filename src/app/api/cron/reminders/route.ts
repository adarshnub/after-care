import { timingSafeEqual } from "node:crypto";
import { sendReminders } from "@/lib/server/push";
import { failure, HttpError, json } from "@/lib/server/http";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const actual = Buffer.from(request.headers.get("authorization") || ""),
      expected = Buffer.from(`Bearer ${secret}`);
    if (
      !secret ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      throw new HttpError(401, "Unauthorized.");
    return json(await sendReminders());
  } catch (error) {
    return failure(error);
  }
}
