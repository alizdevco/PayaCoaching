import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, FileText, Play } from "lucide-react";

import { useExamList } from "./useExamList.js";
import { formatExamDate } from "../../lib/persianDate.js";

function MetaDot() {
  return (
    <span
      className="inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--color-text-muted)]"
      aria-hidden="true"
    />
  );
}

function useScrollSpy(sectionIds) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    if (sectionIds.length === 0) {
      return undefined;
    }

    const visible = new Map();
    const observers = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.set(id, entry.intersectionRatio);
          } else {
            visible.delete(id);
          }

          if (visible.size === 0) {
            return;
          }

          const nextActive = [...visible.entries()].sort(
            (a, b) => b[1] - a[1],
          )[0][0];
          setActiveId(nextActive);
        },
        { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionIds]);

  return activeId;
}

function TocLink({ href, label, active, compact = false }) {
  return (
    <a
      href={href}
      className={[
        "text-sm transition-colors",
        compact
          ? "shrink-0 rounded-lg px-3 py-2"
          : "block rounded-lg py-2.5 pe-3 ps-3",
        active
          ? "border-s-[3px] border-[var(--color-brand)] bg-[var(--color-accent-mint)]/25 font-semibold text-[var(--color-brand-dark)]"
          : "border-s-[3px] border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-text-secondary)]",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

function ContentSection({ id, icon: Icon, title, children, bodyClassName = "" }) {
  return (
    <section
      id={id}
      className="scroll-mt-nav overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <Icon size={18} className="shrink-0 text-[var(--color-brand)]" aria-hidden="true" />
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      <div className={["px-5 py-5 sm:px-6 sm:py-6", bodyClassName].join(" ")}>
        {children}
      </div>
    </section>
  );
}

function OtherAnalysisRow({ exam }) {
  return (
    <Link
      to={`/exam-analysis/${exam.exam_date}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-cream)]"
    >
      <span className="min-w-0 truncate text-sm font-medium text-[var(--color-text-primary)]">
        {exam.title}
      </span>
      <span className="shrink-0 text-xs font-semibold text-[var(--color-brand)]">
        {formatExamDate(exam.exam_date)}
      </span>
    </Link>
  );
}

function downloadAllFiles(files) {
  files.forEach((file) => {
    const link = document.createElement("a");
    link.href = file.public_url;
    link.download = file.title || "file";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

export default function ExamAnalysisView({ exam }) {
  const { data: allExams = [] } = useExamList({ publishedOnly: true });

  const videos = useMemo(
    () => (exam.files ?? []).filter((file) => file.file_type === "video"),
    [exam.files],
  );

  const pdfs = useMemo(
    () => (exam.files ?? []).filter((file) => file.file_type === "pdf"),
    [exam.files],
  );

  const downloadableFiles = useMemo(
    () => [...pdfs, ...videos],
    [pdfs, videos],
  );

  const otherExams = useMemo(
    () =>
      [...allExams]
        .filter((item) => item.exam_date !== exam.exam_date)
        .sort((a, b) => b.exam_date.localeCompare(a.exam_date)),
    [allExams, exam.exam_date],
  );

  const sectionIds = useMemo(() => {
    const ids = ["content"];
    if (videos.length > 0) {
      ids.push("videos");
    }
    if (pdfs.length > 0) {
      ids.push("pdfs");
    }
    return ids;
  }, [videos.length, pdfs.length]);

  const activeSection = useScrollSpy(sectionIds);

  const tocItems = [
    { id: "content", label: "متن تحلیل" },
    ...(videos.length > 0 ? [{ id: "videos", label: "ویدیوها" }] : []),
    ...(pdfs.length > 0 ? [{ id: "pdfs", label: "فایل‌های PDF" }] : []),
  ];

  if (!exam) {
    return null;
  }

  const formattedDate = formatExamDate(exam.exam_date);

  return (
    <div className="space-y-0 bg-[var(--color-cream)]">
      {/* Hero card */}
      <section className="px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center rounded-full bg-[var(--color-accent-mint)]/40 px-3 py-1 text-xs font-semibold leading-normal text-[var(--color-brand-dark)]">
                {formattedDate}
              </span>

              <div className="mt-5 space-y-3">
                <h1 className="font-display text-3xl text-[var(--color-text-primary)] sm:text-4xl">
                  {exam.title}
                </h1>
                {exam.description && (
                  <p className="max-w-3xl text-base leading-8 text-[var(--color-text-secondary)]">
                    {exam.description}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]"
                    aria-hidden="true"
                  />
                  منتشر شده
                </span>
                {pdfs.length > 0 && (
                  <>
                    <MetaDot />
                    <span>{pdfs.length} فایل PDF</span>
                  </>
                )}
                {videos.length > 0 && (
                  <>
                    <MetaDot />
                    <span>{videos.length} ویدیو</span>
                  </>
                )}
              </div>
            </div>

            {downloadableFiles.length > 0 && (
              <button
                type="button"
                onClick={() => downloadAllFiles(downloadableFiles)}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-cream)]"
              >
                <Download size={16} aria-hidden="true" />
                دانلود همه فایل‌ها
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Mobile TOC */}
      <div className="sticky top-20 z-30 border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-2">
          {tocItems.map((item) => (
            <TocLink
              key={item.id}
              href={`#${item.id}`}
              label={item.label}
              active={activeSection === item.id}
              compact
            />
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <nav className="rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
              <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)]">
                فهرست مطالب
              </p>
              <div className="space-y-0.5">
                {tocItems.map((item) => (
                  <TocLink
                    key={item.id}
                    href={`#${item.id}`}
                    label={item.label}
                    active={activeSection === item.id}
                  />
                ))}
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 space-y-6">
          <ContentSection id="content" icon={FileText} title="متن تحلیل">
            <div className="max-w-prose whitespace-pre-wrap text-base leading-8 text-[var(--color-text-primary)]">
              {exam.content}
            </div>
          </ContentSection>

          {videos.length > 0 && (
            <ContentSection id="videos" icon={Play} title="ویدیوها" bodyClassName="space-y-4">
              <ul
                className={[
                  "grid gap-4",
                  videos.length > 1 ? "sm:grid-cols-2" : "",
                ].join(" ")}
              >
                {videos.map((file) => (
                  <li
                    key={file.id}
                    className="overflow-hidden rounded-xl bg-[var(--color-brand-dark)] p-3 sm:p-4"
                  >
                    <p className="mb-2 truncate text-xs font-medium text-[var(--color-accent-light)]">
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
                  </li>
                ))}
              </ul>
            </ContentSection>
          )}

          {pdfs.length > 0 && (
            <ContentSection id="pdfs" icon={FileText} title="فایل‌های PDF">
              <ul className="space-y-2">
                {pdfs.map((file) => (
                  <li key={file.id}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText
                          size={16}
                          className="shrink-0 text-[var(--color-brand)]"
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {file.title}
                        </span>
                      </div>
                      <a
                        href={file.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-sm text-[var(--color-brand)] hover:text-[var(--color-brand-dark)]"
                      >
                        مشاهده ›
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </ContentSection>
          )}
        </div>
      </div>

      {/* Other analyses */}
      {otherExams.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-white px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              تحلیل‌های دیگر
            </h2>
            <ul className="space-y-2">
              {otherExams.map((item) => (
                <li key={item.id}>
                  <OtherAnalysisRow exam={item} />
                </li>
              ))}
            </ul>
            <Link
              to="/#exam-analysis"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-dark)]"
            >
              همه تحلیل‌ها
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
