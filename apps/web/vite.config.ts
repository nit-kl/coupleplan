import { defineConfig } from "vite";

export default defineConfig({
  root: "apps/web",
  server: {
    port: 5173,
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
});
