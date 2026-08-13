import { useMemo } from "react";
import { ExternalLink, FileText, Video } from "lucide-react";

import Card from "../../components/Card.jsx";
import { formatExamDate } from "../../lib/persianDate.js";

function MediaSection({ title, icon: Icon, isEmpty, emptyMessage, children }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
        <Icon size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        {title}
      </h2>
      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

export default function ExamAnalysisView({ exam }) {
  const videos = useMemo(
    () => (exam?.files ?? []).filter((file) => file.file_type === "video"),
    [exam?.files],
  );

  const pdfs = useMemo(
    () => (exam?.files ?? []).filter((file) => file.file_type === "pdf"),
    [exam?.files],
  );

  if (!exam) {
    return null;
  }

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {formatExamDate(exam.exam_date)}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="text-base text-slate-600 dark:text-slate-300">
            {exam.description}
          </p>
        )}
      </header>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">
          متن تحلیل
        </h2>
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200 sm:text-base">
          {exam.content}
        </div>
      </Card>

      <MediaSection
        title="ویدیوها"
        icon={Video}
        isEmpty={videos.length === 0}
        emptyMessage="ویدیویی برای این آزمون منتشر نشده است."
      >
        <ul className="space-y-6">
          {videos.map((file) => (
            <li key={file.id}>
              <Card className="space-y-3">
                <p className="font-medium text-slate-800 dark:text-white">
                  {file.title}
                </p>
                <video
                  controls
                  preload="metadata"
                  src={file.public_url}
                  className="aspect-video w-full rounded-lg bg-black"
                  title={file.title}
                >
                  مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                </video>
              </Card>
            </li>
          ))}
        </ul>
      </MediaSection>

      <MediaSection
        title="فایل‌های PDF"
        icon={FileText}
        isEmpty={pdfs.length === 0}
        emptyMessage="فایل PDF برای این آزمون منتشر نشده است."
      >
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {pdfs.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <p className="min-w-0 font-medium text-slate-800 dark:text-white">
                {file.title}
              </p>
              <a
                href={file.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ExternalLink size={14} aria-hidden="true" />
                مشاهده PDF
              </a>
            </li>
          ))}
        </ul>
      </MediaSection>
    </article>
  );
}
