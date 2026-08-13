export default function LoadingState({
  message = "در حال بارگذاری...",
  fullPage = false,
  className = "",
}) {
  const content = (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500 dark:border-slate-600 dark:border-t-emerald-400"
        aria-hidden="true"
      />
      <p className="text-sm">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">{content}</div>
    );
  }

  return content;
}
