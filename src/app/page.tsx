import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing";

export const metadata: Metadata = {
  title: "After Care — A little care. A better tomorrow.",
  description:
    "From hospital to home, turn nurse-reviewed discharge instructions into a clear daily plan for patients and caregivers. Explore After Care.",
  openGraph: {
    title: "After Care — A little care. A better tomorrow.",
    description:
      "Your recovery, together. A nurse-reviewed daily plan for patients and caregivers.",
    url: "https://after-care1.vercel.app/",
    siteName: "After Care",
    type: "website",
    images: [
      {
        url: "https://after-care1.vercel.app/aftercare-og.png",
        width: 1200,
        height: 630,
        alt: "After Care: a little care, a better tomorrow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "After Care — Your recovery, together",
    images: ["https://after-care1.vercel.app/aftercare-og.png"],
  },
};
export default function Home() {
  return <LandingPage />;
}
