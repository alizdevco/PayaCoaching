import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp } from "lucide-react";

export default function BackToTopButton({ targetId = "home" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(targetId);
    if (!hero) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = !entry.isIntersecting;
        setVisible((prev) => (prev === nextVisible ? prev : nextVisible));
      },
      { rootMargin: "-96px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [targetId]);

  function scrollToTop() {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return createPortal(
    <button
      type="button"
      aria-label="بازگشت به بالا"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      className={[
        "fixed bottom-6 left-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full",
        "bg-[#059669] text-white shadow-lg shadow-black/30",
        "border border-white/20 transition-all duration-300 hover:bg-[#064E3B]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      ].join(" ")}
    >
      <ArrowUp size={22} aria-hidden="true" />
    </button>,
    document.body,
  );
}
