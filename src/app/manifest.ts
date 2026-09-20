import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weinkeller",
    short_name: "Weinkeller",
    description: "Der eigene Weinkeller: erfassen, bewerten, rechtzeitig geniessen.",
    lang: "de-CH",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#f6f1e7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
