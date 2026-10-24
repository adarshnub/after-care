import { z } from "zod";
import { requireNurse } from "@/lib/server/auth";
import { organizeNotes } from "@/lib/server/ai";
import { body, failure, json, rateLimit } from "@/lib/server/http";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireNurse();
    rateLimit(`ai:${user.id}`, 10);
    const { notes, dischargeDate, timezone, mode } = z
      .object({
        notes: z.string().min(10).max(20000),
        dischargeDate: z.iso.date(),
        timezone: z.string().max(80),
        mode: z.enum(["auto", "manual"]).default("auto"),
      })
      .parse(await body(request));
    if (mode === "manual")
      return json({
        plan: {
          summary: "",
          instructions: notes.match(/[\s\S]{1,2000}/g) || [],
          warningSigns: [],
          medications: [],
          tasks: [],
          appointments: [],
        },
        clarifications: [
          "The original notes are preserved below. Add every prescribed medication, reminder time, and appointment explicitly before approving.",
        ],
        source: "manual",
      });
    return json(await organizeNotes(notes, dischargeDate, timezone));
  } catch (error) {
    return failure(error);
  }
}
