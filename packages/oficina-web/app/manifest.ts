import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oficina Virtual de Ingeniería",
    short_name: "Oficina",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#f8f9ff",
    theme_color: "#14b8a6",
  };
}
