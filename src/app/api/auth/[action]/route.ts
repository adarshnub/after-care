import { z } from "zod";
import { viewer, login, logout, establishDemo } from "@/lib/server/auth";
import { demoEnabled } from "@/lib/server/config";
import {
  assertOrigin,
  body,
  failure,
  HttpError,
  json,
  rateLimit,
} from "@/lib/server/http";
import { demoUserId } from "@/lib/server/demo-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    assertOrigin(request);
    const { action } = await context.params;
    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }
    const data = await body(request);
    if (action === "demo") {
      if (!demoEnabled()) throw new HttpError(403, "Demo access is disabled.");
      const { role } = z
        .object({ role: z.enum(["patient", "caregiver", "nurse"]) })
        .parse(data);
      await establishDemo(demoUserId(role));
      return json({ viewer: await viewer() });
    }
    if (action !== "login") throw new HttpError(404, "Not found.");
    const { email, password } = z
      .object({
        email: z.email().max(200),
        password: z.string().min(1).max(200),
      })
      .parse(data);
    rateLimit(`login:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
    return json({ viewer: await login(email, password) });
  } catch (error) {
    return failure(error);
  }
}
