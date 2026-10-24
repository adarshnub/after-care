import { z } from "zod";
import { viewer } from "@/lib/server/auth";
import { completeTask } from "@/lib/server/records";
import { body, failure, json } from "@/lib/server/http";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await viewer();
    const { id } = await context.params;
    const { taskId, date } = z
      .object({ taskId: z.string().min(1).max(80), date: z.iso.date() })
      .parse(await body(request));
    return json({ record: await completeTask(user, id, taskId, date) });
  } catch (error) {
    return failure(error);
  }
}
