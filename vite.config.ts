import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow temporary tunnel domains (cloudflared / localtunnel) to preview the
    // dev server on a phone. Loopback and LAN-IP access are always allowed regardless.
    allowedHosts: [".trycloudflare.com", ".loca.lt"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
