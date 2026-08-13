import { AlertCircle } from "lucide-react";

import Button from "./Button.jsx";

export default function ErrorState({
  message = "خطا در بارگذاری اطلاعات.",
  onRetry,
  fullPage = false,
  className = "",
}) {
  const content = (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 text-center",
        className,
      ].join(" ")}
      role="alert"
    >
      <AlertCircle
        size={32}
        className="text-red-500 dark:text-red-400"
        aria-hidden="true"
      />
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          تلاش مجدد
        </Button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">{content}</div>
    );
  }

  return content;
}
