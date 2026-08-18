import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { preloadFonts } from "./plugins/preloadFonts.js";

/** Injects `<link rel="preconnect">` for the Supabase API origin from env. */
function supabasePreconnect() {
  let supabaseOrigin = "";

  return {
    name: "supabase-preconnect",
    configResolved(config) {
      const url = loadEnv(config.mode, config.envDir, "").VITE_SUPABASE_URL;
      if (url) {
        try {
          supabaseOrigin = new URL(url).origin;
        } catch {
          // ignore invalid URL
        }
      }
    },
    transformIndexHtml(html) {
      if (!supabaseOrigin) {
        return html;
      }

      const tag = `<link rel="preconnect" href="${supabaseOrigin}" crossorigin />`;
      return html.replace("<!-- supabase-preconnect -->", tag);
    },
  };
}

/** Rewrites emitted CSS `<link>` tags to load without blocking first paint. */
function nonBlockingCss() {
  return {
    name: "non-blocking-css",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(
          /<link\s+rel="stylesheet"\s+([^>]*?)>/g,
          (match, attrs) => {
            const hrefMatch = attrs.match(/\bhref="([^"]+)"/);
            if (!hrefMatch) {
              return match;
            }

            const href = hrefMatch[1];
            const crossorigin = /\bcrossorigin\b/.test(attrs)
              ? " crossorigin"
              : "";

            return [
              `<link rel="preload" href="${href}" as="style">`,
              `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"${crossorigin}>`,
              `<noscript><link rel="stylesheet" href="${href}"${crossorigin}></noscript>`,
            ].join("\n    ");
          },
        );
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    supabasePreconnect(),
    preloadFonts(),
    nonBlockingCss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("@supabase")) {
            return "supabase";
          }

          if (id.includes("@tanstack/react-query")) {
            return "query";
          }

          if (
            id.includes("react-router") ||
            id.includes("react-dom") ||
            id.includes("/react/")
          ) {
            return "react-vendor";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
});
