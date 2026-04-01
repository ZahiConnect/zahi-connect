import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/rms": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/hotel": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/ai": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
