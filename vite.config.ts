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
    proxy: {
      // Mirrors api/gov-address.ts (Vercel) for local dev: data.gov.il sends
      // no CORS headers, so the address autocomplete must go through a proxy.
      "/api/gov-address": {
        target: "https://data.gov.il",
        changeOrigin: true,
        rewrite: (proxyPath) =>
          proxyPath.replace(/^\/api\/gov-address/, "/api/3/action/datastore_search"),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
