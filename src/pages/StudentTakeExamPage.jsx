import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Save,
} from "lucide-react";

import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Modal, { ModalActions } from "../components/Modal.jsx";
import { formatPersianDate, formatPersianTime } from "../lib/persianDate.js";
import {
  useStudentOnlineExam,
} from "../features/online-exams/useOnlineExamList.js";
import { useOnlineExamAttempt } from "../features/online-exams/useOnlineExamAttempt.js";
import { useOnlineExamAutoSave } from "../features/online-exams/useOnlineExamAutoSave.js";
import {
  useFinalizeOnlineExamAttempt,
  useStartOnlineExamDownload,
} from "../features/online-exams/useOnlineExamMutations.js";
import {
  canEnterOnlineExam,
  getOnlineExamSchedulingState,
  ONLINE_EXAM_STATE_LABELS,
  ONLINE_EXAM_STATES,
} from "../features/online-exams/onlineExamScheduling.js";

const ANSWER_OPTIONS = [1, 2, 3, 4];

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatRemainingTime(remainingMs) {
  if (remainingMs == null) {
    return "—";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ];

  if (hours > 0) {
    parts.unshift(String(hours).padStart(2, "0"));
  }

  return parts.join(":");
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

function useExamCountdown(startedAt, durationMinutes, onExpire) {
  const [now, setNow] = useState(() => Date.now());
  const expiredCalledRef = useRef(false);

  useEffect(() => {
    if (!startedAt) {
      return undefined;
    }

    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);

  const deadlineMs = startedAt
    ? new Date(startedAt).getTime() + durationMinutes * 60 * 1000
    : null;
  const remainingMs =
    deadlineMs != null ? Math.max(0, deadlineMs - now) : null;
  const isExpired = remainingMs === 0 && startedAt != null;

  useEffect(() => {
    expiredCalledRef.current = false;
  }, [startedAt, durationMinutes]);

  useEffect(() => {
    if (!isExpired || expiredCalledRef.current) {
      return;
    }
    expiredCalledRef.current = true;
    onExpire?.();
  }, [isExpired, onExpire]);

  return { remainingMs, isExpired };
}

function AnswerSheetGrid({ value, onChange, questionCount, disabled = false }) {
  return (
    <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="sticky top-0 z-10 grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
        <span>سوال</span>
        {ANSWER_OPTIONS.map((option) => (
          <span key={option} className="text-center">
            گزینه {option.toLocaleString("fa-IR")}
          </span>
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {Array.from({ length: questionCount }, (_, index) => {
          const question = index + 1;
          const key = String(question);
          const selected = Number(value[key]);

          return (
            <div
              key={key}
              className="grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] items-center gap-1 px-2 py-1.5"
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {question.toLocaleString("fa-IR")}
              </span>
              {ANSWER_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={[
                    "flex cursor-pointer items-center justify-center rounded-md border px-1 py-1.5 text-xs transition-colors",
                    selected === option
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/60",
                    disabled ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    if (selected === option) {
                      const next = { ...value };
                      delete next[key];
                      onChange(next);
                      return;
                    }
                    onChange({
                      ...value,
                      [key]: option,
                    });
                  }}
                >
                  <input
                    type="radio"
                    name={`student-answer-${key}`}
                    value={option}
                    checked={selected === option}
                    disabled={disabled}
                    readOnly
                    className="sr-only"
                  />
                  {option.toLocaleString("fa-IR")}
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SaveStatus({ isSaving, lastSavedAt, saveError }) {
  if (saveError) {
    return (
      <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
    );
  }

  if (isSaving) {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <Save size={12} aria-hidden="true" />
        در حال ذخیره...
      </p>
    );
  }

  if (lastSavedAt) {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={12} aria-hidden="true" />
        ذخیره شد — {formatPersianTime(lastSavedAt)}
      </p>
    );
  }

  return null;
}

function FinalizedResults({ attempt, questionCount }) {
  const answeredCount = Object.keys(attempt.answers ?? {}).filter((key) => {
    const questionNum = Number(key);
    if (!Number.isInteger(questionNum) || questionNum < 1 || questionNum > questionCount) {
      return false;
    }
    const value = Number(attempt.answers[key]);
    return Number.isInteger(value) && value >= 1 && value <= 4;
  }).length;

  return (
    <Card className="space-y-4 border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          آزمون پایان یافت
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          نتیجه بر اساس آخرین پاسخ‌های ذخیره‌شده محاسبه شده است.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white px-4 py-3 dark:bg-slate-800/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">نمره خام</dt>
          <dd className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
            {formatScore(attempt.raw_score)}
          </dd>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 dark:bg-slate-800/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">درصد</dt>
          <dd className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatPercentage(attempt.percentage)}
          </dd>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 dark:bg-slate-800/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">
            پاسخ‌داده‌شده
          </dt>
          <dd className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
            {answeredCount.toLocaleString("fa-IR")} /{" "}
            {questionCount.toLocaleString("fa-IR")}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export default function StudentTakeExamPage() {
  const { examId } = useParams();

  const [localAnswers, setLocalAnswers] = useState({});
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const {
    data: exam,
    isLoading: isExamLoading,
    isError: isExamError,
    refetch: refetchExam,
  } = useStudentOnlineExam(examId);

  const {
    data: attempt,
    isLoading: isAttemptLoading,
    isError: isAttemptError,
    refetch: refetchAttempt,
  } = useOnlineExamAttempt(examId);

  const startDownload = useStartOnlineExamDownload();
  const finalizeAttempt = useFinalizeOnlineExamAttempt();

  const isFinalized = attempt?.status === "finalized";
  const hasStarted = Boolean(attempt?.started_at);
  const isInProgress = attempt?.status === "in_progress" && hasStarted;

  const schedulingState =
    exam != null
      ? getOnlineExamSchedulingState(exam, attempt ?? null)
      : ONLINE_EXAM_STATES.NOT_YET_OPEN;
  const isEnterable = exam != null && canEnterOnlineExam(schedulingState);

  const { isSaving, lastSavedAt, saveError, saveNow } = useOnlineExamAutoSave(
    attempt?.id,
    localAnswers,
    {
      enabled: isInProgress,
      examId,
      status: attempt?.status ?? "in_progress",
    },
  );

  useEffect(() => {
    if (attempt?.answers && typeof attempt.answers === "object") {
      setLocalAnswers(attempt.answers);
    }
  }, [attempt?.id]);

  const handleAutoExpire = useCallback(async () => {
    if (!attempt?.id || attempt.status !== "in_progress") {
      return;
    }

    setActionError("");
    try {
      await saveNow();
      await finalizeAttempt.mutateAsync({
        attemptId: attempt.id,
        force: false,
      });
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "پایان خودکار آزمون ناموفق بود."),
      );
    }
  }, [attempt?.id, attempt?.status, finalizeAttempt, saveNow]);

  const { remainingMs, isExpired } = useExamCountdown(
    attempt?.started_at,
    exam?.duration_minutes ?? 0,
    handleAutoExpire,
  );

  useEffect(() => {
    if (!isInProgress) {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInProgress]);

  async function handleDownloadConfirm() {
    setActionError("");

    try {
      const { downloadUrl } = await startDownload.mutateAsync({ examId });
      setDownloadModalOpen(false);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "دانلود PDF ناموفق بود."),
      );
    }
  }

  async function handleSubmitConfirm() {
    if (!attempt?.id) {
      return;
    }

    setActionError("");

    try {
      await saveNow();
      await finalizeAttempt.mutateAsync({
        attemptId: attempt.id,
        force: true,
      });
      setSubmitModalOpen(false);
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "ثبت نهایی آزمون ناموفق بود."),
      );
    }
  }

  const isLoading = isExamLoading || isAttemptLoading;
  const isError = isExamError || isAttemptError;
  const isBusy =
    startDownload.isPending || finalizeAttempt.isPending || isSaving;

  const questionCount = exam?.question_count ?? 150;

  const answeredCount = Object.keys(localAnswers).filter((key) => {
    const questionNum = Number(key);
    if (!Number.isInteger(questionNum) || questionNum < 1 || questionNum > questionCount) {
      return false;
    }
    const value = Number(localAnswers[key]);
    return Number.isInteger(value) && value >= 1 && value <= 4;
  }).length;

  if (isLoading) {
    return <LoadingState message="در حال بارگذاری آزمون..." />;
  }

  if (isError) {
    return (
      <ErrorState
        message="خطا در بارگذاری آزمون."
        onRetry={() => {
          refetchExam();
          refetchAttempt();
        }}
      />
    );
  }

  if (!exam) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <ErrorState message="آزمون یافت نشد یا هنوز زمان شروع آن نرسیده است." />
        <Link to="/student/online-exams">
          <Button variant="secondary">بازگشت به لیست</Button>
        </Link>
      </div>
    );
  }

  if (!isEnterable) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Card className="space-y-3">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            {exam.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {ONLINE_EXAM_STATE_LABELS[schedulingState] ?? "این آزمون در دسترس نیست."}
          </p>
          {schedulingState === ONLINE_EXAM_STATES.CLOSED_EXPIRED && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              مهلت شرکت در این آزمون به پایان رسیده و امکان شروع یا ادامه وجود
              ندارد.
            </p>
          )}
        </Card>
        <Link to="/student/online-exams">
          <Button variant="secondary">بازگشت به لیست</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/student/online-exams"
          className="mb-3 inline-flex items-center gap-1 text-sm text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowRight size={16} aria-hidden="true" />
          بازگشت به لیست
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {exam.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          شروع: {formatPersianDate(exam.start_at)} —{" "}
          {formatPersianTime(exam.start_at)} · مدت:{" "}
          {exam.duration_minutes.toLocaleString("fa-IR")} دقیقه
        </p>
      </div>

      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
      )}

      {isFinalized && attempt && (
        <FinalizedResults attempt={attempt} questionCount={questionCount} />
      )}

      {!hasStarted && !isFinalized && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              شروع آزمون
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              برای شروع، فایل PDF سوالات را دانلود کنید. با کلیک روی دانلود،
              زمان {exam.duration_minutes.toLocaleString("fa-IR")} دقیقه‌ای آزمون
              آغاز می‌شود و قابل توقف نیست.
            </p>
          </div>
          <Button onClick={() => setDownloadModalOpen(true)}>
            <Download size={16} aria-hidden="true" />
            دانلود PDF و شروع آزمون
          </Button>
        </Card>
      )}

      {hasStarted && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Clock size={16} aria-hidden="true" />
              {isFinalized ? (
                <span>آزمون پایان یافته</span>
              ) : (
                <span>
                  زمان باقی‌مانده:{" "}
                  <strong
                    className={[
                      "font-mono text-base",
                      isExpired
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    ].join(" ")}
                  >
                    {formatRemainingTime(remainingMs)}
                  </strong>
                </span>
              )}
            </div>

            {isInProgress && (
              <div className="flex flex-wrap items-center gap-3">
                <SaveStatus
                  isSaving={isSaving}
                  lastSavedAt={lastSavedAt}
                  saveError={saveError}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {answeredCount.toLocaleString("fa-IR")} /{" "}
                  {questionCount.toLocaleString("fa-IR")} پاسخ
                </span>
              </div>
            )}
          </div>

          {isInProgress && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={isBusy}
                onClick={() => setDownloadModalOpen(true)}
              >
                <Download size={14} aria-hidden="true" />
                دانلود مجدد PDF
              </Button>
              <Button
                disabled={isBusy || isExpired}
                onClick={() => setSubmitModalOpen(true)}
              >
                ثبت نهایی پاسخ‌ها
              </Button>
            </div>
          )}
        </Card>
      )}

      {(isInProgress || isFinalized) && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              پاسخنامه
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isFinalized
                ? "پاسخ‌های ثبت‌شده (فقط مشاهده)"
                : "پاسخ‌ها به‌صورت خودکار ذخیره می‌شوند. سوالات بدون پاسخ نمره صفر می‌گیرند."}
            </p>
          </div>

          <AnswerSheetGrid
            value={localAnswers}
            onChange={setLocalAnswers}
            questionCount={questionCount}
            disabled={!isInProgress || isBusy}
          />
        </Card>
      )}

      <Modal
        isOpen={downloadModalOpen}
        onClose={() => {
          if (!startDownload.isPending) {
            setDownloadModalOpen(false);
          }
        }}
        title={hasStarted ? "دانلود مجدد PDF" : "شروع آزمون"}
        footer={
          <ModalActions
            onCancel={() => setDownloadModalOpen(false)}
            onConfirm={handleDownloadConfirm}
            confirmLabel={hasStarted ? "دانلود" : "شروع و دانلود"}
            isLoading={startDownload.isPending}
          />
        }
      >
        {hasStarted ? (
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            فایل PDF در تب جدید باز می‌شود. زمان آزمون تغییر نمی‌کند.
          </p>
        ) : (
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            با تأیید، زمان آزمون ({exam.duration_minutes.toLocaleString("fa-IR")}{" "}
            دقیقه) از همین لحظه شروع می‌شود. PDF در تب جدید باز می‌شود.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={submitModalOpen}
        onClose={() => {
          if (!finalizeAttempt.isPending) {
            setSubmitModalOpen(false);
          }
        }}
        title="ثبت نهایی پاسخ‌ها"
        footer={
          <ModalActions
            onCancel={() => setSubmitModalOpen(false)}
            onConfirm={handleSubmitConfirm}
            confirmLabel="ثبت نهایی"
            isLoading={finalizeAttempt.isPending || isSaving}
          />
        }
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          پس از ثبت نهایی، امکان تغییر پاسخ‌ها وجود ندارد.{" "}
          {answeredCount.toLocaleString("fa-IR")} سوال پاسخ داده شده است.
        </p>
      </Modal>
    </div>
  );
}
