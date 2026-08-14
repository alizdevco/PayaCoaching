import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";

import Button from "../../components/Button.jsx";
import { useExamList } from "./useExamList.js";
import { formatExamDate } from "../../lib/persianDate.js";

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

function TocLink({ href, label, active }) {
  return (
    <a
      href={href}
      className={[
        "block rounded-full px-4 py-2 text-sm transition-colors",
        active
          ? "bg-[#064E3B] font-medium text-white"
          : "text-[#57534E] hover:bg-[#F7F5F0] hover:text-[#1C1917]",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

function ExamMiniCard({ exam, currentDate }) {
  const isCurrent = exam.exam_date === currentDate;

  return (
    <Link
      to={`/exam-analysis/${exam.exam_date}`}
      className={[
        "flex min-w-[220px] shrink-0 flex-col gap-2 rounded-2xl border p-4 transition-shadow",
        isCurrent
          ? "border-[#059669] bg-[#F7F5F0]"
          : "border-stone-200 bg-white hover:shadow-md",
      ].join(" ")}
    >
      <span className="text-xs font-semibold text-[#059669]">
        {formatExamDate(exam.exam_date)}
      </span>
      <span className="line-clamp-2 text-sm font-bold text-[#1C1917]">
        {exam.title}
      </span>
    </Link>
  );
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

  const otherExams = useMemo(
    () => allExams.filter((item) => item.exam_date !== exam.exam_date),
    [allExams, exam.exam_date],
  );

  const sortedExams = useMemo(
    () =>
      [...allExams].sort((a, b) => b.exam_date.localeCompare(a.exam_date)),
    [allExams],
  );

  const currentIndex = sortedExams.findIndex(
    (item) => item.exam_date === exam.exam_date,
  );
  const newerExam = currentIndex > 0 ? sortedExams[currentIndex - 1] : null;
  const olderExam =
    currentIndex >= 0 && currentIndex < sortedExams.length - 1
      ? sortedExams[currentIndex + 1]
      : null;

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

  return (
    <div className="space-y-0">
      {/* Compact hero header */}
      <section className="relative overflow-hidden bg-[#F7F5F0] px-4 py-12 sm:px-6 sm:py-16">
        <div
          className="landing-blob start-[8%] top-[20%] h-10 w-32 opacity-20"
          aria-hidden="true"
        />
        <div
          className="landing-blob end-[12%] bottom-[20%] h-8 w-24 opacity-15"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl space-y-4">
          <span className="inline-flex rounded-full bg-[#064E3B] px-4 py-1.5 text-sm font-medium text-[#6EE7B7]">
            {formatExamDate(exam.exam_date)}
          </span>
          <h1 className="font-display text-3xl text-[#1C1917] sm:text-4xl">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="max-w-3xl text-base leading-8 text-[#57534E]">
              {exam.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs text-[#57534E]">
              {videos.length} ویدیو
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-[#57534E]">
              {pdfs.length} PDF
            </span>
            <span className="rounded-full bg-[#6EE7B7]/30 px-3 py-1 text-xs text-[#064E3B]">
              منتشر شده
            </span>
          </div>
        </div>
      </section>

      {/* Mobile tab bar */}
      <div className="sticky top-20 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
                activeSection === item.id
                  ? "bg-[#064E3B] font-medium text-white"
                  : "bg-[#F7F5F0] text-[#57534E]",
              ].join(" ")}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:gap-12">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-8">
            <nav className="space-y-1">
              <p className="mb-3 text-xs font-semibold tracking-wide text-[#78716C]">
                فهرست مطالب
              </p>
              {tocItems.map((item) => (
                <TocLink
                  key={item.id}
                  href={`#${item.id}`}
                  label={item.label}
                  active={activeSection === item.id}
                />
              ))}
            </nav>

            {otherExams.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide text-[#78716C]">
                  آزمون‌های دیگر
                </p>
                <ul className="space-y-2">
                  {otherExams.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/exam-analysis/${item.exam_date}`}
                        className="block rounded-xl px-3 py-2 text-sm text-[#57534E] transition-colors hover:bg-[#F7F5F0] hover:text-[#1C1917]"
                      >
                        <span className="block text-xs font-medium text-[#059669]">
                          {formatExamDate(item.exam_date)}
                        </span>
                        <span className="line-clamp-1 font-medium">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/#exam-analysis"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#059669] hover:text-[#064E3B]"
                >
                  همه تحلیل‌ها
                  <ArrowLeft size={14} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 space-y-0">
          <section
            id="content"
            className="scroll-mt-nav rounded-2xl bg-white px-4 py-10 sm:px-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#064E3B] text-[#6EE7B7]">
                <FileText size={20} aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-[#1C1917]">متن تحلیل</h2>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="max-w-prose whitespace-pre-wrap text-base leading-8 text-[#1C1917]">
                {exam.content}
              </div>
            </div>
          </section>

          {videos.length > 0 && (
            <section
              id="videos"
              className="scroll-mt-nav relative mt-4 overflow-hidden rounded-2xl bg-[#0A1A14] px-4 py-10 sm:px-8 sm:py-12"
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-48"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(110,231,183,0.15), transparent 60%)",
                }}
                aria-hidden="true"
              />
              <h2 className="relative mb-8 text-xl font-bold text-white">
                ویدیوها
              </h2>
              <ul
                className={[
                  "relative grid gap-6",
                  videos.length > 1 ? "sm:grid-cols-2" : "",
                ].join(" ")}
              >
                {videos.map((file) => (
                  <li key={file.id} className="space-y-3">
                    <p className="font-medium text-white">{file.title}</p>
                    <video
                      controls
                      preload="metadata"
                      src={file.public_url}
                      className="aspect-video w-full rounded-2xl bg-black"
                      title={file.title}
                    >
                      مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                    </video>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pdfs.length > 0 && (
            <section
              id="pdfs"
              className="scroll-mt-nav mt-4 rounded-2xl bg-[#F7F5F0] px-4 py-10 sm:px-8"
            >
              <h2 className="mb-6 text-xl font-bold text-[#1C1917]">
                فایل‌های PDF
              </h2>
              <ul className="space-y-3">
                {pdfs.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#064E3B]/10 text-[#064E3B]">
                        <FileText size={18} aria-hidden="true" />
                      </span>
                      <p className="min-w-0 font-medium text-[#1C1917]">
                        {file.title}
                      </p>
                    </div>
                    <a
                      href={file.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="dark" size="sm" className="rounded-full">
                        مشاهده PDF
                      </Button>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <section className="border-t border-stone-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#1C1917]">تحلیل‌های دیگر</h2>
            <div className="flex gap-2">
              {olderExam ? (
                <Link to={`/exam-analysis/${olderExam.exam_date}`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                  >
                    <ArrowRight size={16} aria-hidden="true" />
                    قبلی
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  disabled
                >
                  <ArrowRight size={16} aria-hidden="true" />
                  قبلی
                </Button>
              )}
              {newerExam ? (
                <Link to={`/exam-analysis/${newerExam.exam_date}`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                  >
                    بعدی
                    <ArrowLeft size={16} aria-hidden="true" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  disabled
                >
                  بعدی
                  <ArrowLeft size={16} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          {otherExams.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {sortedExams.map((item) => (
                <ExamMiniCard
                  key={item.id}
                  exam={item}
                  currentDate={exam.exam_date}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
