import { z } from "zod";
import { viewer } from "@/lib/server/auth";
import { accessibleRecord } from "@/lib/server/records";
import { askAssistant } from "@/lib/server/ai";
import { body, failure, json, rateLimit } from "@/lib/server/http";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await viewer();
    rateLimit(`ai:${user.id}`, 15);
    const { recordId, message } = z
      .object({
        recordId: z.string().max(80),
        message: z.string().trim().min(1).max(2000),
      })
      .parse(await body(request));
    return json(
      await askAssistant(await accessibleRecord(user, recordId), message),
    );
  } catch (error) {
    return failure(error);
  }
}
