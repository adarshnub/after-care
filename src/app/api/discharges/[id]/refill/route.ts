import { z } from "zod";
import { viewer } from "@/lib/server/auth";
import { addRefill } from "@/lib/server/records";
import { body, failure, json } from "@/lib/server/http";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await viewer();
    const { id } = await context.params;
    const data = z
      .object({
        requestId: z.uuid(),
        medicationId: z.string().min(1).max(80),
        quantity: z.number().positive().max(100000),
      })
      .parse(await body(request));
    return json({
      record: await addRefill(
        user,
        id,
        data.medicationId,
        data.quantity,
        data.requestId,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
