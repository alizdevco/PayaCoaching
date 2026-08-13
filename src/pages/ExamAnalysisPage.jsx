import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import Navbar from "../components/Navbar.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ExamAnalysisView from "../features/exams/ExamAnalysisView.jsx";
import { useExamAnalysis } from "../features/exams/useExamAnalysis.js";
import { formatExamDate } from "../lib/persianDate.js";

function ExamNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
        تحلیل آزمون یافت نشد
      </h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
        این تحلیل منتشر نشده یا وجود ندارد.
      </p>
      <Link to="/">
        <Button variant="secondary">بازگشت به صفحه اصلی</Button>
      </Link>
    </div>
  );
}

export default function ExamAnalysisPage() {
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
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {isLoading && (
          <LoadingState message="در حال بارگذاری تحلیل آزمون..." fullPage />
        )}

        {!isLoading && isError && (
          <ErrorState
            message={error?.message ?? "خطا در بارگذاری تحلیل آزمون."}
            onRetry={() => refetch()}
            fullPage
          />
        )}

        {!isLoading && !isError && !exam && <ExamNotFound />}

        {!isLoading && !isError && exam && <ExamAnalysisView exam={exam} />}
      </main>
    </div>
  );
}
