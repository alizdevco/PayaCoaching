let extendedFontsPromise;

/** Loads Medium/Bold Vazirmatn after first paint (deferred from landing critical path). */
export function loadExtendedFonts() {
  if (!extendedFontsPromise) {
    extendedFontsPromise = import("../app-fonts-extended.css");
  }

  return extendedFontsPromise;
}

/** Defers extended font loading until the browser is idle. */
export function scheduleLoadExtendedFonts() {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => {
      void loadExtendedFonts();
    });
    return () => cancelIdleCallback(id);
  }

  const timeoutId = window.setTimeout(() => {
    void loadExtendedFonts();
  }, 1);
  return () => window.clearTimeout(timeoutId);
}
