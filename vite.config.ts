import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome114",
    rollupOptions: {
      input: "src/content.ts",
      output: {
        format: "iife",
        entryFileNames: "content.js",
      },
    },
  },
});
