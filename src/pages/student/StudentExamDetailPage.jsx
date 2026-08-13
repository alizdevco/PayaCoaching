import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import Button from "../../components/Button.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ExamAnalysisView from "../../features/exams/ExamAnalysisView.jsx";
import { useExamAnalysis } from "../../features/exams/useExamAnalysis.js";
import { formatExamDate } from "../../lib/persianDate.js";

function ExamNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
        تحلیل آزمون یافت نشد
      </h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
        این تحلیل منتشر نشده یا وجود ندارد.
      </p>
      <Link to="/student/exams">
        <Button variant="secondary">بازگشت به فهرست</Button>
      </Link>
    </div>
  );
}

export default function StudentExamDetailPage() {
  const { exam_date: examDate } = useParams();
  const { data: exam, isLoading, isError, error, refetch } = useExamAnalysis(examDate);

  useEffect(() => {
    if (!exam) {
      document.title = "تحلیل آزمون | پایا کوچینگ";
      return;
    }

    document.title = `تحلیل آزمون ${formatExamDate(exam.exam_date)} | پایا کوچینگ`;
  }, [exam]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/student/exams"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400"
      >
        <ArrowRight size={16} aria-hidden="true" />
        بازگشت به فهرست تحلیل‌ها
      </Link>

      {isLoading && <LoadingState message="در حال بارگذاری تحلیل آزمون..." />}

      {!isLoading && isError && (
        <ErrorState
          message={error?.message ?? "خطا در بارگذاری تحلیل آزمون."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && !exam && <ExamNotFound />}

      {!isLoading && !isError && exam && <ExamAnalysisView exam={exam} />}
    </div>
  );
}
