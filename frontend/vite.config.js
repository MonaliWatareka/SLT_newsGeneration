import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // LOCAL ONLY - do not commit. The backend runs on 8081 on this machine
        // because something else holds 8080. On the VM it stays 8080.
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
});
