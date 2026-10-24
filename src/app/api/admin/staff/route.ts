import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { database, configured } from "@/lib/server/config";
import { body, failure, HttpError, json, rateLimit } from "@/lib/server/http";

// Administrative provisioning stays behind the same Next.js backend as all other writes.
// Keep STAFF_PROVISIONING_SECRET unset except when the hospital administrator needs this endpoint.
export async function POST(request: Request) {
  try {
    const secret = process.env.STAFF_PROVISIONING_SECRET;
    const actual = Buffer.from(request.headers.get("authorization") || ""),
      expected = Buffer.from(`Bearer ${secret}`);
    if (
      !secret ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      throw new HttpError(401, "Unauthorized.");
    if (!configured()) throw new HttpError(503, "Configure Supabase first.");
    rateLimit("staff-provisioning", 5);
    const input = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(200),
      })
      .parse(await body(request));
    const db = database();
    // Verify the real schema before creating an Auth account that would need rollback.
    const schema = await db
      .from("staff_members")
      .select("user_id,name")
      .limit(0);
    if (schema.error) {
      const missingSchema = ["PGRST205", "PGRST204", "42P01", "42703"].includes(
        schema.error.code,
      );
      throw new HttpError(
        503,
        missingSchema
          ? "Hospital database setup is incomplete. Apply the After Care migration before creating nurse accounts."
          : "The hospital database is unavailable. Please try again.",
      );
    }
    const password = `Ac-${randomBytes(18).toString("base64url")}!`;
    const result = await db.auth.admin.createUser({
      email: input.email.toLowerCase(),
      password,
      email_confirm: true,
    });
    if (result.error || !result.data.user)
      throw new HttpError(
        409,
        "Couldn’t create this staff account. Check the email address.",
      );
    const saved = await db
      .from("staff_members")
      .insert({ user_id: result.data.user.id, name: input.name });
    if (saved.error) {
      console.error(
        "[After Care staff]",
        JSON.stringify({ code: saved.error.code }),
      );
      await db.auth.admin.deleteUser(result.data.user.id);
      throw new Error("Staff provisioning failed");
    }
    return json({ email: input.email.toLowerCase(), password }, 201);
  } catch (error) {
    return failure(error);
  }
}
