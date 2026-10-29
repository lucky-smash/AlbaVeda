import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    target: "es2022",
    // The only chunk above the default limit is the Three.js stage, which is
    // dynamically imported after first paint on the homepage only.
    chunkSizeWarningLimit: 650,
  },
});
