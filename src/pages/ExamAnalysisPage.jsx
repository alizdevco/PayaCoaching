import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import LandingFooter from "../components/LandingFooter.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ExamAnalysisView from "../features/exams/ExamAnalysisView.jsx";
import { useExamAnalysis } from "../features/exams/useExamAnalysis.js";
import { formatExamDate } from "../lib/persianDate.js";

function ExamAnalysisSkeleton() {
  return (
    <div className="space-y-0">
      <div className="bg-[#F7F5F0] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="landing-skeleton h-8 w-32 rounded-full" />
          <div className="landing-skeleton h-10 w-2/3 max-w-lg rounded-xl" />
          <div className="landing-skeleton h-5 w-full max-w-xl rounded-lg" />
          <div className="landing-skeleton h-5 w-3/4 max-w-md rounded-lg" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="landing-skeleton h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function ExamNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="font-display text-2xl text-[#1C1917] sm:text-3xl">
        تحلیل آزمون یافت نشد
      </h1>
      <p className="max-w-md text-sm leading-7 text-[#57534E]">
        این تحلیل منتشر نشده یا وجود ندارد.
      </p>
      <Link to="/">
        <Button variant="dark" className="rounded-full">
          بازگشت به صفحه اصلی
        </Button>
      </Link>
    </div>
  );
}

function Breadcrumb() {
  return (
    <nav
      aria-label="مسیر صفحه"
      className="border-b border-stone-200/80 bg-white px-4 py-3 sm:px-6"
    >
      <ol className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-sm text-[#78716C]">
        <li>
          <Link to="/" className="hover:text-[#059669]">
            خانه
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronLeft size={14} className="text-[#78716C]" />
        </li>
        <li className="font-medium text-[#1C1917]">
          <Link to="/#exam-analysis" className="hover:text-[#059669]">
            تحلیل آزمون
          </Link>
        </li>
      </ol>
    </nav>
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
    <div dir="rtl" className="min-h-screen bg-white text-[#1C1917]">
      <Navbar />

      <Breadcrumb />

      <main>
        {isLoading && <ExamAnalysisSkeleton />}

        {!isLoading && isError && (
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <ErrorState
              message={error?.message ?? "خطا در بارگذاری تحلیل آزمون."}
              onRetry={() => refetch()}
              fullPage
            />
          </div>
        )}

        {!isLoading && !isError && !exam && <ExamNotFound />}

        {!isLoading && !isError && exam && <ExamAnalysisView exam={exam} />}
      </main>

      <LandingFooter />
    </div>
  );
}
