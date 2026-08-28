import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { formatPersianDate, formatPersianTime } from "../lib/persianDate.js";
import {
  useOnlineExam,
  useOnlineExamAttempts,
} from "../features/online-exams/useOnlineExamList.js";

const SKELETON_ROWS = 5;

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <tr
          key={index}
          className="border-b border-slate-100 dark:border-slate-700/60"
        >
          {Array.from({ length: 6 }, (__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function StatusBadge({ status }) {
  if (status === "finalized") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        نهایی‌شده
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
      در حال انجام
    </span>
  );
}
function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }                                                                                                                                                                                                                                                                                                                                                                                     
  return Number(value).toLocaleString("fa-IR", {
    maximumFractionDigits: 2,
  });
}


function formatPercentage(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toLocaleString("fa-IR", {
    maximumFractionDigits: 1,
  })}٪`;
}

function getStudentName(student) {
  if (!student) {
    return "—";
  }
  const name = [student.first_name, student.last_name].filter(Boolean).join(" ");
  return name || "—";
}

export default function OnlineExamResultsPage() {
  const { examId } = useParams();

  const {
    data: exam,
    isLoading: isExamLoading,
    isError: isExamError,
    refetch: refetchExam,
  } = useOnlineExam(examId);

  const {
    data: attempts = [],
    isLoading: isAttemptsLoading,
    isError: isAttemptsError,
    refetch: refetchAttempts,
    isFetching,
  } = useOnlineExamAttempts(examId);

  const isLoading = isExamLoading || isAttemptsLoading;
  const isError = isExamError || isAttemptsError;

  const finalizedCount = attempts.filter(
    (attempt) => attempt.status === "finalized",
  ).length;

  function handleRetry() {
    refetchExam();
    refetchAttempts();
  }

  if (isLoading && !exam && attempts.length === 0) {
    return (
      <div dir="rtl">
        <LoadingState message="در حال بارگذاری نتایج..." />
      </div>
    );
  }

  if (isError && !exam) {
    return (
      <div dir="rtl">
        <ErrorState message="خطا در بارگذاری نتایج آزمون." onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <Link
          to="/admin/online-exams"
          className="mb-3 inline-flex items-center gap-1 text-sm text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowRight size={16} />
          بازگشت به لیست آزمون‌ها
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          نتایج آزمون
        </h1>
        {exam && (
          <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {exam.title}
            </p>
            <p>
              شروع: {formatPersianDate(exam.start_at)} —{" "}
              {formatPersianTime(exam.start_at)}
            </p>
            <p>
              مدت: {exam.duration_minutes.toLocaleString("fa-IR")} دقیقه —{" "}
              {finalizedCount.toLocaleString("fa-IR")} از{" "}
              {attempts.length.toLocaleString("fa-IR")} شرکت‌کننده نهایی‌شده
            </p>
          </div>
        )}
      </div>

      <Card className="overflow-hidden p-0" data-testid="online-exam-results-table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  دانش‌آموز
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  موبایل
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  وضعیت
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  شروع
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  نمره خام
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  درصد
                </th>
              </tr>
            </thead>
            <tbody>
              {isAttemptsLoading && attempts.length === 0 && <TableSkeleton />}

              {!isAttemptsLoading && !isAttemptsError && attempts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    هنوز هیچ دانش‌آموزی در این آزمون شرکت نکرده است.
                  </td>
                </tr>
              )}

              {!isAttemptsError &&
                attempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                      {getStudentName(attempt.student)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {attempt.student?.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={attempt.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {attempt.started_at ? (
                        <>
                          <div>{formatPersianDate(attempt.started_at)}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatPersianTime(attempt.started_at)}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatScore(attempt.raw_score)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatPercentage(attempt.percentage)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {isAttemptsError && (
          <div className="space-y-3 p-6">
            <ErrorState
              message="خطا در بارگذاری تلاش‌های دانش‌آموزان."
              onRetry={() => refetchAttempts()}
            />
          </div>
        )}

        {isFetching && !isAttemptsLoading && (
          <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-700">
            در حال به‌روزرسانی...
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => refetchAttempts()}>
          به‌روزرسانی نتایج
        </Button>
      </div>
    </div>
  );
}
