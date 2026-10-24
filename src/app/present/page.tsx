import type { Metadata } from "next";
import { Presentation } from "@/components/marketing/presentation";

export const metadata: Metadata = {
  title: "Presenting After Care — Your recovery, together",
};
export default function PresentPage() {
  return <Presentation />;
}
