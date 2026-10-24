import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "After Care — Your recovery, together",
    short_name: "After Care",
    description:
      "A little care, every day. Your hospital-reviewed discharge plan, medication schedule, and care team.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#237a70",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
