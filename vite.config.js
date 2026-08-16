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
  plugins: [
    react(),
    tailwindcss(),
    supabasePreconnect(),
    preloadFonts(),
    nonBlockingCss(),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
});
