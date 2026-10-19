/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Must match the redirect address registered in Entra ID (http://localhost:5173).
    // strictPort makes Vite fail loudly instead of silently moving to 5174, where sign-in would break.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
