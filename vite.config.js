import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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

/** Rewrites font preload hrefs to hashed production asset paths. */
function preloadFonts() {
  const devFontPaths = [
    ["/src/assets/fonts/Lalezar-Regular.woff2", "Lalezar-Regular"],
    ["/src/assets/fonts/Vazirmatn-Regular.woff2", "Vazirmatn-Regular"],
  ];

  return {
    name: "preload-fonts",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) {
          return html;
        }

        let result = html;
        for (const [devPath, namePattern] of devFontPaths) {
          const fontAsset = Object.values(ctx.bundle).find(
            (chunk) =>
              chunk.type === "asset" &&
              chunk.fileName.includes(namePattern) &&
              chunk.fileName.endsWith(".woff2"),
          );

          if (fontAsset) {
            result = result.replace(devPath, `/${fontAsset.fileName}`);
          }
        }
        return result;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), supabasePreconnect(), preloadFonts()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
});
