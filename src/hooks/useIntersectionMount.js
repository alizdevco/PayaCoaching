import { useEffect, useRef, useState } from "react";

/**
 * Returns true once `ref` intersects the viewport (optionally with rootMargin).
 * Observer disconnects after the first intersection.
 */
export function useIntersectionMount({ rootMargin = "200px 0px", enabled = true } = {}) {
  const ref = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!enabled || isMounted) {
      return undefined;
    }

    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [enabled, isMounted, rootMargin]);

  return { ref, isMounted };
}
