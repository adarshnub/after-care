import { AftercareApp } from "@/components/aftercare-app";
import { demoEnabled } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Home() {
  return <AftercareApp allowDemo={demoEnabled()} />;
}
