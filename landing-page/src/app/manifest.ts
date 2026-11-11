import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Companion",
    short_name: "Companion",
    description: "A desktop pet that keeps you company while you work.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [{ src: "/applogo.png", sizes: "512x512", type: "image/png" }],
  };
}
