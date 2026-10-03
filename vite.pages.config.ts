import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "pages",
  plugins: [react()],
  publicDir: "../pages-public",
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
