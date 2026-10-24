import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./marketing.css";
export const metadata: Metadata = {
  title: "After Care — Your recovery, together",
  description:
    "A little care, every day. Your personal recovery plan, medications, appointments, and care team.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "After Care",
  },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#237a70",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
