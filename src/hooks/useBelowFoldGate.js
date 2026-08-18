import { useCallback, useEffect, useState } from "react";

import { loadExtendedFonts } from "../lib/loadExtendedFonts.js";
import { scrollToSection } from "../utils/scrollToSection.js";

/** Defers below-the-fold landing sections until scroll, idle, or a hash target. */
export function useBelowFoldGate() {
  const [ready, setReady] = useState(false);
  const [sentinelNode, setSentinelNode] = useState(null);

  const sentinelRef = useCallback((node) => {
    setSentinelNode(node);
  }, []);

  useEffect(() => {
    if (ready) {
      return undefined;
    }

    let cancelled = false;

    const enable = () => {
      if (cancelled) {
        return;
      }

      setReady(true);
      void loadExtendedFonts();
    };

    const hash = window.location.hash.slice(1);
    if (hash && hash !== "home") {
      enable();
      scrollToSection(hash);
      return () => {
        cancelled = true;
      };
    }

    const cleanups = [];

    if (sentinelNode && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            enable();
            observer.disconnect();
          }
        },
        { rootMargin: "200px 0px" },
      );

      observer.observe(sentinelNode);
      cleanups.push(() => observer.disconnect());
    }

    if ("requestIdleCallback" in window) {
      const idleId = requestIdleCallback(enable, { timeout: 2000 });
      cleanups.push(() => cancelIdleCallback(idleId));
    } else {
      const timeoutId = window.setTimeout(enable, 2000);
      cleanups.push(() => window.clearTimeout(timeoutId));
    }

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [ready, sentinelNode]);

  return { ready, sentinelRef };
}
