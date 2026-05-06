import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rawBasePath = process.env.VITE_BASE_PATH;
const basePath =
  rawBasePath && rawBasePath !== "/"
    ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}/`
    : "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5274,
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
      "^/hotel(/|$)": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/ai": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/booking": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/mobility": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4174,
    strictPort: true,
  },
});
