import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Video } from "lucide-react";

import Card from "../../components/Card.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import { useExamList } from "../../features/exams/useExamList.js";
import { formatExamDate } from "../../lib/persianDate.js";

function ExamCard({ exam }) {
  return (
    <Card className="admin-stagger-in flex h-full flex-col gap-4 transition-shadow hover:shadow-md">
      <div className="space-y-1">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {formatExamDate(exam.exam_date)}
        </p>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          {exam.title}
        </h2>
        {exam.description && (
          <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {exam.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {exam.videoCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Video size={14} aria-hidden="true" />
            {exam.videoCount.toLocaleString("fa-IR")} ویدیو
          </span>
        )}
        {exam.pdfCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText size={14} aria-hidden="true" />
            {exam.pdfCount.toLocaleString("fa-IR")} PDF
          </span>
        )}
      </div>

      <Link to={`/student/exams/${exam.exam_date}`} className="mt-auto">
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          مشاهده تحلیل
          <ArrowLeft size={16} aria-hidden="true" />
        </span>
      </Link>
    </Card>
  );
}

export default function StudentExamsPage() {
  const { data: exams = [], isLoading, isError, error, refetch } = useExamList({
    publishedOnly: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          تحلیل آزمون‌ها
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          تحلیل‌های منتشرشده آزمون‌های گذشته را مشاهده و فایل‌های مرتبط را
          دانلود کنید.
        </p>
      </div>

      {isLoading && <LoadingState message="در حال بارگذاری تحلیل‌ها..." />}

      {!isLoading && isError && (
        <ErrorState
          message={error?.message ?? "خطا در بارگذاری تحلیل آزمون‌ها."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && exams.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          هنوز تحلیل آزمونی منتشر نشده است.
        </p>
      )}

      {!isLoading && !isError && exams.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <li key={exam.id}>
              <ExamCard exam={exam} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
