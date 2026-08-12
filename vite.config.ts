import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Relative asset URLs work for both user/organization Pages and project Pages.
  base: "./",
  plugins: [react(), cloudflare()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
