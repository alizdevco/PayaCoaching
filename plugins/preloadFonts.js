const FONT_PRELOADS = [
  {
    devPath: "/src/assets/fonts/Lalezar-Regular.woff2",
    namePattern: "Lalezar-Regular",
  },
  {
    devPath: "/src/assets/fonts/Vazirmatn-Regular.woff2",
    namePattern: "Vazirmatn-Regular",
  },
  {
    devPath: "/src/assets/fonts/Vazirmatn-SemiBold.woff2",
    namePattern: "Vazirmatn-SemiBold",
  },
];

function findHashedFontAsset(bundle, namePattern) {
  return Object.values(bundle).find(
    (chunk) =>
      chunk.type === "asset" &&
      chunk.fileName.includes(namePattern) &&
      chunk.fileName.endsWith(".woff2"),
  );
}

/** Rewrites font preload hrefs to hashed production asset paths during build. */
export function preloadFonts() {
  return {
    name: "preload-fonts",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) {
          return html;
        }

        let result = html;
        for (const { devPath, namePattern } of FONT_PRELOADS) {
          const fontAsset = findHashedFontAsset(bundle, namePattern);
          if (fontAsset) {
            result = result.replaceAll(devPath, `/${fontAsset.fileName}`);
          }
        }
        return result;
      },
    },
  };
}
