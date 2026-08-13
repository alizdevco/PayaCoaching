import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Video } from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useExamList } from "../features/exams/useExamList.js";
import { formatExamDate } from "../lib/persianDate.js";

function ExamAnalysisSection() {
  const { data: exams = [], isLoading, isError, error, refetch } = useExamList({
    publishedOnly: true,
  });

  return (
    <section id="exam-analysis" className="scroll-mt-20">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          تحلیل آزمون
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          تحلیل‌های منتشرشده آزمون‌های گذشته را مشاهده کنید.
        </p>
      </div>

      {isLoading && (
        <LoadingState message="در حال بارگذاری تحلیل‌های آزمون..." />
      )}

      {!isLoading && isError && (
        <ErrorState
          message={error?.message ?? "خطا در بارگذاری تحلیل‌های آزمون."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && exams.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          هنوز تحلیلی منتشر نشده است.
        </p>
      )}

      {!isLoading && !isError && exams.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <li key={exam.id}>
              <Card className="admin-action-card flex h-full flex-col gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatExamDate(exam.exam_date)}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {exam.title}
                  </h3>
                  {exam.description && (
                    <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Video size={14} aria-hidden="true" />
                    {exam.videoCount} ویدیو
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText size={14} aria-hidden="true" />
                    {exam.pdfCount} PDF
                  </span>
                </div>

                <Link
                  to={`/exam-analysis/${exam.exam_date}`}
                  className="mt-auto"
                >
                  <Button variant="secondary" className="w-full">
                    <span className="inline-flex items-center justify-center gap-2">
                      مشاهده تحلیل
                      <ArrowLeft size={16} aria-hidden="true" />
                    </span>
                  </Button>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function LandingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <Navbar />

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
              پایا کوچینگ
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              همراه شما در مسیر موفقیت تحصیلی — مشاوره، محتوای اختصاصی و تحلیل
              آزمون.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register">
                <Button>ثبت‌نام</Button>
              </Link>
              <a href="#exam-analysis">
                <Button variant="secondary">تحلیل آزمون</Button>
              </a>
            </div>
          </div>
        </section>

        <section
          id="product"
          className="scroll-mt-20 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1e293b]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                معرفی محصول
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                پلتفرم پایا کوچینگ ابزارهای مشاوره تحصیلی، مدیریت محتوای
                دانش‌آموز و تحلیل آزمون را در یکجا ارائه می‌دهد.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <ExamAnalysisSection />
        </section>

        <section
          id="contact"
          className="scroll-mt-20 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1e293b]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                تماس با ما
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                برای اطلاعات بیشتر با تیم پایا کوچینگ در ارتباط باشید.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0f172a]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6 dark:text-slate-400">
          © {new Date().getFullYear()} پایا کوچینگ
        </div>
      </footer>
    </div>
  );
}
