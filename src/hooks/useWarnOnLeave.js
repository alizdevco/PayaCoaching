import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export function useWarnOnLeave(isActive) {
  const blocker = useBlocker(isActive);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isActive]);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    const confirmed = window.confirm(
      "آپلود در حال انجام است. آیا مطمئنید که می‌خواهید این صفحه را ترک کنید؟",
    );
    if (confirmed) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);
}
