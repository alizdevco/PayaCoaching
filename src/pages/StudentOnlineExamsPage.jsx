import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  PlayCircle,
} from "lucide-react";

import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { useStudentOnlineExamList } from "../features/online-exams/useOnlineExamList.js";
import { formatPersianDate, formatPersianTime } from "../lib/persianDate.js";

const EXAM_STATUS = {
  UPCOMING: "upcoming",
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  FINISHED: "finished",
};

const STATUS_LABELS = {
  [EXAM_STATUS.UPCOMING]: "هنوز شروع نشده",
  [EXAM_STATUS.OPEN]: "آماده شرکت",
  [EXAM_STATUS.IN_PROGRESS]: "در حال انجام",
  [EXAM_STATUS.FINISHED]: "پایان یافته",
};

const STATUS_BADGE_CLASS = {
  [EXAM_STATUS.UPCOMING]:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  [EXAM_STATUS.OPEN]:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  [EXAM_STATUS.IN_PROGRESS]:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  [EXAM_STATUS.FINISHED]:
    "bg-red-100 text-red-700/80 dark:bg-red-950/40 dark:text-red-400",
};

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value).toLocaleString("fa-IR", {
    maximumFractionDigits: 1,
  });
}

function canEnterExam(status) {
  return (
    status === EXAM_STATUS.OPEN ||
    status === EXAM_STATUS.IN_PROGRESS ||
    status === EXAM_STATUS.FINISHED
  );
}

function getActionLabel(status) {
  switch (status) {
    case EXAM_STATUS.IN_PROGRESS:
      return "ادامه";
    case EXAM_STATUS.OPEN:
      return "ورود به آزمون";
    case EXAM_STATUS.FINISHED:
      return "مشاهده نتیجه";
    default:
      return null;
  }
}

function StatusBadge({ status }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_BADGE_CLASS[status] ??
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      ].join(" ")}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ExamCard({ exam }) {
  const status = exam.status;
  const enterable = canEnterExam(status);
  const actionLabel = getActionLabel(status);
  const scoreLabel = formatScore(exam.percentage);

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {exam.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {formatPersianDate(exam.start_at)} — {formatPersianTime(exam.start_at)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={14} aria-hidden="true" />
          {exam.duration_minutes.toLocaleString("fa-IR")} دقیقه
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText size={14} aria-hidden="true" />
          {(exam.question_count ?? 150).toLocaleString("fa-IR")} سوال
        </span>
      </div>

      {status === EXAM_STATUS.FINISHED && scoreLabel != null && (
        <p className="inline-flex items-center gap-1 text-sm text-red-700/90 dark:text-red-400">
          <CheckCircle2 size={14} aria-hidden="true" />
          نتیجه: {scoreLabel}٪
        </p>
      )}

      <div className="mt-auto">
        {enterable && actionLabel ? (
          <Link to={`/student/online-exams/${exam.id}`}>
            <Button variant="secondary" className="w-full">
              <span className="inline-flex items-center justify-center gap-2">
                {status === EXAM_STATUS.IN_PROGRESS ? (
                  <PlayCircle size={16} aria-hidden="true" />
                ) : (
                  <ArrowLeft size={16} aria-hidden="true" />
                )}
                {actionLabel}
              </span>
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            <span className="inline-flex items-center justify-center gap-2">
              <Lock size={16} aria-hidden="true" />
              {STATUS_LABELS[status] ?? "غیرفعال"}
            </span>
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function StudentOnlineExamsPage() {
  const {
    data: exams = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useStudentOnlineExamList({ refetchInterval: 30_000 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          آزمون آنلاین
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          آزمون‌های فعال را انتخاب کنید. پس از دانلود PDF، زمان آزمون شروع
          می‌شود.
        </p>
      </div>

      {isLoading && <LoadingState message="در حال بارگذاری آزمون‌ها..." />}

      {!isLoading && isError && (
        <ErrorState
          message="خطا در بارگذاری آزمون‌ها."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && exams.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          هنوز آزمون آنلاینی ثبت نشده است.
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

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400">در حال به‌روزرسانی...</p>
      )}
    </div>
  );
}
