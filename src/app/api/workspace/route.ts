import { viewer } from "@/lib/server/auth";
import { listRecords } from "@/lib/server/records";
import { aiConfigured, pushConfigured } from "@/lib/server/config";
import { failure, json } from "@/lib/server/http";
export async function GET() {
  try {
    const user = await viewer();
    return json({
      viewer: user,
      records: await listRecords(user),
      aiConfigured: aiConfigured(),
      pushConfigured: pushConfigured(),
    });
  } catch (error) {
    return failure(error);
  }
}
