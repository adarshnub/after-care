import { requireNurse } from "@/lib/server/auth";
import { createRecord } from "@/lib/server/records";
import { dischargeSchema } from "@/lib/types";
import { body, failure, json, rateLimit } from "@/lib/server/http";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireNurse();
    rateLimit(`discharges:${user.id}`, 10);
    const input = dischargeSchema.parse(await body(request));
    return json(await createRecord(user, input), 201);
  } catch (error) {
    return failure(error);
  }
}
