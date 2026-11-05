import { defineConfig } from "vite";

export default defineConfig({
  // This repository publishes at https://philipasuncion6-tech.github.io/
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets"
  }
});
