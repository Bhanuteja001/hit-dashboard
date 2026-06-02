import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy API requests to local backend during development
      "/auth": "http://localhost:5000",
      "/projects": "http://localhost:5000",
      "/stores": "http://localhost:5000",
      "/contacts": "http://localhost:5000",
    },
  },
});
