import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Video } from "lucide-react";

import Button from "../Button.jsx";
import Card from "../Card.jsx";
import ErrorState from "../ErrorState.jsx";
import LoadingState from "../LoadingState.jsx";
import { useExamList } from "../../features/exams/useExamList.js";
import { useIntersectionMount } from "../../hooks/useIntersectionMount.js";
import { formatExamDate, toPersianDigits } from "../../lib/persianDate.js";

const PAGE_SIZE = 1;

function ExamCard({ exam }) {
  return (
    <Card className="flex h-full flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 !shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#059669]">
          {formatExamDate(exam.exam_date)}
        </p>
        <h3 className="text-lg font-bold text-[#1C1917]">{exam.title}</h3>
        {exam.description && (
          <p className="line-clamp-2 text-sm leading-7 text-[#57534E]">
            {exam.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[#78716C]">
        <span className="inline-flex items-center gap-1">
          <Video size={14} aria-hidden="true" />
          {exam.videoCount} ویدیو
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText size={14} aria-hidden="true" />
          {exam.pdfCount} PDF
        </span>
      </div>

      <Link to={`/exam-analysis/${exam.exam_date}`} className="mt-auto">
        <Button
          variant="secondary"
          className="w-full rounded-full border-stone-200 text-[#1C1917] hover:bg-[#F7F5F0]"
        >
          <span className="inline-flex items-center justify-center gap-2">
            مشاهده تحلیل
            <ArrowLeft size={16} aria-hidden="true" />
          </span>
        </Button>
      </Link>
    </Card>
  );
}

function ExamAnalysisContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useExamList({
    publishedOnly: true,
    page,
    pageSize: PAGE_SIZE,
  });

  const exams = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  if (isLoading) {
    return <LoadingState message="در حال بارگذاری تحلیل‌های آزمون..." />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? "خطا در بارگذاری تحلیل‌های آزمون."}
        onRetry={() => refetch()}
      />
    );
  }

  if (totalCount === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-200 bg-[#F7F5F0] px-6 py-12 text-center text-sm text-[#57534E]">
        هنوز تحلیلی منتشر نشده است.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-4 lg:grid-cols-1">
        {exams.map((exam) => (
          <li key={exam.id}>
            <ExamCard exam={exam} />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-sm text-[#57534E]">
            صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              <ArrowRight size={16} aria-hidden="true" />
              قبلی
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              بعدی
              <ArrowLeft size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ExamAnalysisSection() {
  const { ref, isMounted } = useIntersectionMount({ rootMargin: "200px 0px" });

  return (
    <section
      id="exam-analysis"
      ref={ref}
      className="scroll-mt-nav bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4 lg:sticky lg:top-28">
            <h2 className="font-display text-3xl text-[#1C1917] sm:text-4xl">
              تحلیل آزمون
            </h2>
            <p className="text-base leading-8 text-[#57534E]">
              تحلیل‌های منتشرشده آزمون‌های گذشته را مشاهده کنید و با بررسی
              دقیق نتایج، مسیر بهبود عملکرد خود را پیدا کنید.
            </p>
          </div>

          <div>{isMounted ? <ExamAnalysisContent /> : null}</div>
        </div>
      </div>
    </section>
  );
}
