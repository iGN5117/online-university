import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Online University",
    short_name: "University",
    description: "Learn anything in bite-size cards.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#2f8f86",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
