import { z } from "zod";
import { viewer } from "@/lib/server/auth";
import { subscribe, unsubscribe, subscriptionSchema } from "@/lib/server/push";
import { pushConfigured } from "@/lib/server/config";
import { body, failure, json } from "@/lib/server/http";
export async function GET() {
  try {
    await viewer();
    return json({
      publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await viewer();
    await subscribe(user, subscriptionSchema.parse(await body(request)));
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await viewer();
    const data = z
      .object({ endpoint: z.url().max(4000) })
      .parse(await body(request));
    await unsubscribe(user, data.endpoint);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
