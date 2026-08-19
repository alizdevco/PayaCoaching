import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { getProfileFieldStyles } from "../components/StudentProfileFields.jsx";
import JalaliDateInput from "../components/JalaliDateInput.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Modal, { ModalActions } from "../components/Modal.jsx";
import { formatPersianDate, formatPersianTime } from "../lib/persianDate.js";
import { useWarnOnLeave } from "../hooks/useWarnOnLeave.js";
import {
  useOnlineExamAssignedStudents,
  useOnlineExamList,
  useOnlineExam,
} from "../features/online-exams/useOnlineExamList.js";
import {
  useCreateOnlineExam,
  useDeleteOnlineExam,
  useSetOnlineExamAssignments,
  useUpdateOnlineExam,
  useUploadOnlineExamPdf,
} from "../features/online-exams/useOnlineExamMutations.js";
import { useStudents } from "../features/students/useStudents.js";

const adminFieldStyles = getProfileFieldStyles("admin");
const MAX_QUESTION_COUNT = 150;
const DEFAULT_QUESTION_COUNT = 150;
const SKELETON_ROWS = 4;
const ANSWER_OPTIONS = [1, 2, 3, 4];

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function isoToLocalDate(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoToLocalTime(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function createEmptyAnswerKey(questionCount) {
  return Object.fromEntries(
    Array.from({ length: questionCount }, (_, index) => [
      String(index + 1),
      "",
    ]),
  );
}

function normalizeAnswerKeyFromExam(answerKey, questionCount) {
  const normalized = createEmptyAnswerKey(questionCount);
  if (!answerKey || typeof answerKey !== "object") {
    return normalized;
  }

  for (let question = 1; question <= questionCount; question += 1) {
    const key = String(question);
    const value = Number(answerKey[key]);
    if (Number.isInteger(value) && value >= 1 && value <= 4) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function answerKeyToPayload(answerKey, questionCount) {
  const payload = {};
  for (let question = 1; question <= questionCount; question += 1) {
    const key = String(question);
    payload[key] = Number(answerKey[key]);
  }
  return payload;
}

function matchesStudentSearch(student, query) {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return true;
  }

  const searchableFields = [student.first_name, student.last_name, student.phone];

  return searchableFields.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(trimmedQuery),
  );
}

function formatStudentDisplayName(student) {
  const name = [student?.first_name, student?.last_name].filter(Boolean).join(" ");
  return name || student?.phone || "دانش‌آموز";
}

function validateAnswerKey(answerKey, questionCount) {
  for (let question = 1; question <= questionCount; question += 1) {
    const value = Number(answerKey[String(question)]);
    if (!Number.isInteger(value) || value < 1 || value > 4) {
      return `پاسخ سوال ${question.toLocaleString("fa-IR")} را انتخاب کنید.`;
    }
  }
  return null;
}

function resizeAnswerKey(answerKey, newCount) {
  const next = createEmptyAnswerKey(newCount);
  for (let question = 1; question <= newCount; question += 1) {
    const key = String(question);
    const value = Number(answerKey[key]);
    if (Number.isInteger(value) && value >= 1 && value <= 4) {
      next[key] = value;
    }
  }
  return next;
}

function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  message,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmLabel="حذف"
          isLoading={isLoading}
        />
      }
    >
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        {message}
      </p>
    </Modal>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <tr
          key={index}
          className="border-b border-slate-100 dark:border-slate-700/60"
        >
          {Array.from({ length: 5 }, (__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function UploadProgressBar({ progress }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>در حال آپلود PDF...</span>
        <span>{progress.toLocaleString("fa-IR")}٪</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function PdfBadge({ hasPdf }) {
  if (hasPdf) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <FileText size={12} aria-hidden="true" />
        آپلود شده
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
      بدون PDF
    </span>
  );
}

function AnswerKeyGrid({ value, onChange, questionCount, disabled = false }) {
  return (
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
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
                >
                  <input
                    type="radio"
                    name={`answer-key-${key}`}
                    value={option}
                    checked={selected === option}
                    disabled={disabled}
                    className="sr-only"
                    onChange={() =>
                      onChange({
                        ...value,
                        [key]: option,
                      })
                    }
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

function ExamFormView({ examId: initialExamId, onBack, onSaved }) {
  const isEditMode = Boolean(initialExamId);
  const [savedExamId, setSavedExamId] = useState(initialExamId ?? null);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [answerKeyError, setAnswerKeyError] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [answerKey, setAnswerKey] = useState(() =>
    createEmptyAnswerKey(DEFAULT_QUESTION_COUNT),
  );
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccessMessage, setAssignmentSuccessMessage] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set());
  const [assignmentsInitialized, setAssignmentsInitialized] = useState(false);
  const pdfInputRef = useRef(null);

  const examId = savedExamId ?? initialExamId ?? null;
  const canManagePdf = Boolean(examId);

  const createExam = useCreateOnlineExam();
  const updateExam = useUpdateOnlineExam();
  const uploadPdf = useUploadOnlineExamPdf();
  const setAssignments = useSetOnlineExamAssignments();

  const { data: studentsData, isLoading: isStudentsLoading } = useStudents();
  const {
    data: assignedStudents = [],
    isLoading: isAssignmentsLoading,
  } = useOnlineExamAssignedStudents(examId);

  const {
    data: examDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useOnlineExam(examId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      startDate: "",
      startTime: "",
      durationMinutes: 120,
      questionCount: DEFAULT_QUESTION_COUNT,
    },
  });

  const watchedQuestionCount = watch("questionCount");

  useWarnOnLeave(uploadPdf.isPending);

  useEffect(() => {
    if (!examDetail) {
      return;
    }

    reset({
      title: examDetail.title ?? "",
      startDate: isoToLocalDate(examDetail.start_at),
      startTime: isoToLocalTime(examDetail.start_at),
      durationMinutes: examDetail.duration_minutes ?? 120,
      questionCount: examDetail.question_count ?? DEFAULT_QUESTION_COUNT,
    });
    const count = examDetail.question_count ?? DEFAULT_QUESTION_COUNT;
    setQuestionCount(count);
    setAnswerKey(normalizeAnswerKeyFromExam(examDetail.answer_key, count));
  }, [examDetail, reset]);

  useEffect(() => {
    const count = Number(watchedQuestionCount);
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_QUESTION_COUNT ||
      count === questionCount
    ) {
      return;
    }
    setQuestionCount(count);
    setAnswerKey((prev) => resizeAnswerKey(prev, count));
  }, [watchedQuestionCount, questionCount]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!assignmentError) {
      return;
    }

    const timer = window.setTimeout(() => setAssignmentError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [assignmentError]);

  useEffect(() => {
    if (!assignmentSuccessMessage) {
      return;
    }

    const timer = window.setTimeout(() => setAssignmentSuccessMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [assignmentSuccessMessage]);

  useEffect(() => {
    setAssignmentSearch("");
    setAssignmentError("");
    setAssignmentSuccessMessage("");
    setSelectedStudentIds(new Set());
    setAssignmentsInitialized(false);
  }, [examId]);

  useEffect(() => {
    if (!assignedStudents.length && assignmentsInitialized) {
      return;
    }
    if (isAssignmentsLoading || assignmentsInitialized) {
      return;
    }

    setSelectedStudentIds(
      new Set(assignedStudents.map((assignment) => assignment.student_id)),
    );
    setAssignmentsInitialized(true);
  }, [assignedStudents, assignmentsInitialized, isAssignmentsLoading]);

  const allStudents = studentsData?.students ?? [];

  const lockedStudentIds = useMemo(
    () =>
      new Set(
        assignedStudents
          .filter((assignment) => assignment.has_attempt)
          .map((assignment) => assignment.student_id),
      ),
    [assignedStudents],
  );

  const filteredStudents = useMemo(
    () => allStudents.filter((student) => matchesStudentSearch(student, assignmentSearch)),
    [allStudents, assignmentSearch],
  );

  const isSaving = createExam.isPending || updateExam.isPending;
  const isAssignmentDataLoading = isStudentsLoading || isAssignmentsLoading;
  const isSavingAssignments =
    isAssignmentDataLoading || setAssignments.isPending;

  function onSubmit(values) {
    setServerError("");
    setAnswerKeyError("");
    setSuccessMessage("");

    const count = Number(values.questionCount);
    const answerKeyValidationError = validateAnswerKey(answerKey, count);
    if (answerKeyValidationError) {
      setAnswerKeyError(answerKeyValidationError);
      return;
    }

    const payload = {
      title: values.title,
      startAt: {
        date: values.startDate,
        time: values.startTime,
      },
      durationMinutes: values.durationMinutes,
      questionCount: count,
      answerKey: answerKeyToPayload(answerKey, count),
    };

    if (canManagePdf) {
      updateExam.mutate(
        { examId, ...payload },
        {
          onSuccess: (data) => {
            setSuccessMessage("تغییرات با موفقیت ذخیره شد.");
            setSavedExamId(data.id);
            onSaved?.(data.id);
          },
          onError: (error) => {
            setServerError(
              getMutationErrorMessage(error, "ذخیره آزمون ناموفق بود."),
            );
          },
        },
      );
      return;
    }

    createExam.mutate(payload, {
      onSuccess: (data) => {
        setSavedExamId(data.id);
        setSuccessMessage("آزمون ایجاد شد. اکنون می‌توانید PDF آپلود کنید.");
        onSaved?.(data.id);
      },
      onError: (error) => {
        setServerError(
          getMutationErrorMessage(error, "ایجاد آزمون ناموفق بود."),
        );
      },
    });
  }

  async function handlePdfSelected(fileList) {
    if (!examId) {
      setFileError("ابتدا آزمون را ذخیره کنید.");
      return;
    }

    const file = fileList?.[0];
    if (!file) {
      return;
    }

    if (!file.type.includes("pdf")) {
      setFileError("فقط فایل PDF مجاز است.");
      return;
    }

    setFileError("");
    setUploadProgress(0);

    try {
      await uploadPdf.mutateAsync({
        examId,
        file,
        onProgress: setUploadProgress,
      });
      setSuccessMessage("فایل PDF با موفقیت آپلود شد.");
    } catch (error) {
      setFileError(getMutationErrorMessage(error, "آپلود PDF ناموفق بود."));
    } finally {
      setUploadProgress(0);
    }
  }

  function toggleStudentSelection(studentId) {
    if (lockedStudentIds.has(studentId)) {
      return;
    }

    setSelectedStudentIds((previous) => {
      const next = new Set(previous);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  function selectAllFilteredStudents() {
    setSelectedStudentIds((previous) => {
      const next = new Set(previous);
      filteredStudents.forEach((student) => next.add(student.id));
      return next;
    });
  }

  function clearStudentSelection() {
    setSelectedStudentIds(new Set(lockedStudentIds));
  }

  function handleSaveAssignments() {
    if (!examId) {
      return;
    }

    setAssignmentError("");
    setAssignmentSuccessMessage("");
    setAssignments.mutate(
      { examId, studentIds: [...selectedStudentIds] },
      {
        onSuccess: () =>
          setAssignmentSuccessMessage(
            "دسترسی آزمون با موفقیت برای دانش‌آموزان ثبت شد.",
          ),
        onError: (error) => {
          setAssignmentError(
            getMutationErrorMessage(error, "ذخیره دسترسی دانش‌آموزان ناموفق بود."),
          );
        },
      },
    );
  }

  const pageTitle =
    isEditMode || canManagePdf ? "ویرایش آزمون آنلاین" : "آزمون آنلاین جدید";

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          disabled={uploadPdf.isPending}
          className="mb-3 inline-flex items-center gap-1 text-sm text-emerald-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowRight size={16} />
          بازگشت به لیست
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {pageTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {canManagePdf
            ? "ویرایش اطلاعات آزمون، کلید پاسخ و فایل PDF"
            : "اطلاعات آزمون را وارد کنید و سپس PDF را آپلود کنید"}
        </p>
      </div>

      {isEditMode && isDetailLoading && !examDetail && !canManagePdf && (
        <LoadingState message="در حال بارگذاری آزمون..." />
      )}

      {isEditMode && isDetailError && !canManagePdf && (
        <ErrorState
          message="خطا در بارگذاری آزمون."
          onRetry={() => refetchDetail()}
        />
      )}

      {(!isEditMode || examDetail || canManagePdf) && (
        <>
          <Card>
            <form
              className="space-y-4"
              onSubmit={handleSubmit(onSubmit)}
              data-testid="online-exam-form"
            >
              <div>
                <label className={adminFieldStyles.label} htmlFor="exam-title">
                  عنوان
                </label>
                <input
                  id="exam-title"
                  type="text"
                  className={adminFieldStyles.input}
                  placeholder="مثلاً آزمون جامع شماره ۱"
                  {...register("title", { required: "عنوان الزامی است." })}
                />
                {errors.title && (
                  <p className={adminFieldStyles.error}>{errors.title.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={adminFieldStyles.label} htmlFor="start-date">
                    تاریخ شروع
                  </label>
                  <Controller
                    name="startDate"
                    control={control}
                    rules={{ required: "تاریخ شروع الزامی است." }}
                    render={({ field }) => (
                      <JalaliDateInput
                        id="start-date"
                        className={adminFieldStyles.input}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.startDate && (
                    <p className={adminFieldStyles.error}>
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className={adminFieldStyles.label} htmlFor="start-time">
                    ساعت شروع
                  </label>
                  <input
                    id="start-time"
                    type="time"
                    className={adminFieldStyles.input}
                    {...register("startTime", {
                      required: "ساعت شروع الزامی است.",
                    })}
                  />
                  {errors.startTime && (
                    <p className={adminFieldStyles.error}>
                      {errors.startTime.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className={adminFieldStyles.label}
                    htmlFor="duration-minutes"
                  >
                    مدت (دقیقه)
                  </label>
                  <input
                    id="duration-minutes"
                    type="number"
                    min={1}
                    className={adminFieldStyles.input}
                    {...register("durationMinutes", {
                      required: "مدت آزمون الزامی است.",
                      min: { value: 1, message: "مدت باید بیشتر از صفر باشد." },
                      valueAsNumber: true,
                    })}
                  />
                  {errors.durationMinutes && (
                    <p className={adminFieldStyles.error}>
                      {errors.durationMinutes.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className={adminFieldStyles.label}
                    htmlFor="question-count"
                  >
                    تعداد سوالات
                  </label>
                  <input
                    id="question-count"
                    type="number"
                    min={1}
                    max={MAX_QUESTION_COUNT}
                    className={adminFieldStyles.input}
                    {...register("questionCount", {
                      required: "تعداد سوالات الزامی است.",
                      min: {
                        value: 1,
                        message: "حداقل ۱ سوال لازم است.",
                      },
                      max: {
                        value: MAX_QUESTION_COUNT,
                        message: `حداکثر ${MAX_QUESTION_COUNT.toLocaleString("fa-IR")} سوال مجاز است.`,
                      },
                      valueAsNumber: true,
                    })}
                  />
                  {errors.questionCount && (
                    <p className={adminFieldStyles.error}>
                      {errors.questionCount.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className={adminFieldStyles.label}>
                    کلید پاسخ ({questionCount.toLocaleString("fa-IR")} سوال)
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    نمره: صحیح +۱، غلط −۱/۳، خالی ۰
                  </span>
                </div>
                <AnswerKeyGrid
                  value={answerKey}
                  onChange={setAnswerKey}
                  questionCount={questionCount}
                  disabled={isSaving}
                />
                {answerKeyError && (
                  <p className={`${adminFieldStyles.error} mt-2`}>
                    {answerKeyError}
                  </p>
                )}
              </div>

              {serverError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {serverError}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {successMessage}
                </p>
              )}

              <Button type="submit" isLoading={isSaving}>
                {canManagePdf ? "ذخیره تغییرات" : "ایجاد آزمون"}
              </Button>
            </form>
          </Card>

          {canManagePdf && (
            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  فایل PDF آزمون
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  دانش‌آموز پس از شروع آزمون می‌تواند این فایل را دانلود کند.
                </p>
              </div>

              {examDetail?.pdf_file_path ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  PDF آپلود شده است.
                </p>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  هنوز PDF آپلود نشده است.
                </p>
              )}

              {fileError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {fileError}
                </p>
              )}

              {uploadPdf.isPending && (
                <UploadProgressBar progress={uploadProgress} />
              )}

              <div>
                <Button
                  variant="secondary"
                  disabled={uploadPdf.isPending}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <Upload size={14} aria-hidden="true" />
                  {examDetail?.pdf_file_path ? "جایگزینی PDF" : "آپلود PDF"}
                </Button>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    handlePdfSelected(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
            </Card>
          )}

          {canManagePdf && (
            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  دسترسی دانش‌آموزان
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  فقط دانش‌آموزان انتخاب‌شده این آزمون را در پنل خود می‌بینند.
                </p>
              </div>

              <div>
                <label className={adminFieldStyles.label} htmlFor="assignment-search">
                  جستجو
                </label>
                <input
                  id="assignment-search"
                  type="search"
                  className={adminFieldStyles.input}
                  placeholder="نام یا شماره موبایل..."
                  value={assignmentSearch}
                  onChange={(event) => setAssignmentSearch(event.target.value)}
                  disabled={isAssignmentDataLoading}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isAssignmentDataLoading || filteredStudents.length === 0}
                  onClick={selectAllFilteredStudents}
                >
                  انتخاب همه
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isAssignmentDataLoading || selectedStudentIds.size === 0}
                  onClick={clearStudentSelection}
                >
                  پاک کردن انتخاب
                </Button>
              </div>

              {isAssignmentDataLoading ? (
                <LoadingState message="در حال بارگذاری لیست دانش‌آموزان..." />
              ) : filteredStudents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {assignmentSearch.trim()
                    ? "دانش‌آموزی با این جستجو یافت نشد."
                    : "هنوز دانش‌آموزی ثبت نشده است."}
                </p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  {filteredStudents.map((student) => {
                    const isLocked = lockedStudentIds.has(student.id);
                    const isChecked = selectedStudentIds.has(student.id);

                    return (
                      <label
                        key={student.id}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors",
                          isLocked
                            ? "cursor-not-allowed bg-slate-50 dark:bg-slate-800/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600"
                          checked={isChecked}
                          disabled={isLocked || setAssignments.isPending}
                          onChange={() => toggleStudentSelection(student.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-800 dark:text-white">
                            {formatStudentDisplayName(student)}
                          </span>
                          {student.phone && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {student.phone}
                            </span>
                          )}
                          {isLocked && (
                            <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                              این دانش‌آموز قبلاً آزمون را شروع کرده و قابل حذف نیست.
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {assignmentError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {assignmentError}
                </p>
              )}

              <Button
                type="button"
                onClick={handleSaveAssignments}
                isLoading={setAssignments.isPending}
                disabled={isSavingAssignments}
              >
                ذخیره دسترسی
              </Button>
            </Card>
          )}

          {assignmentSuccessMessage && (
            <div
              className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4"
              role="status"
              aria-live="polite"
            >
              <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
                <span>{assignmentSuccessMessage}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OnlineExamManagementPage() {
  const [view, setView] = useState("list");
  const [editingExamId, setEditingExamId] = useState(null);
  const [examToDelete, setExamToDelete] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data: exams = [], isLoading, isError, refetch, isFetching } =
    useOnlineExamList();

  const deleteExam = useDeleteOnlineExam();

  const sortedExams = useMemo(
    () =>
      [...exams].sort(
        (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
      ),
    [exams],
  );

  function openCreateForm() {
    setEditingExamId(null);
    setView("form");
  }

  function openEditForm(examId) {
    setEditingExamId(examId);
    setView("form");
  }

  function backToList() {
    setView("list");
    setEditingExamId(null);
  }

  function handleDeleteConfirm() {
    if (!examToDelete) {
      return;
    }

    setActionError("");
    deleteExam.mutate(examToDelete.id, {
      onSuccess: () => {
        setExamToDelete(null);
        if (editingExamId === examToDelete.id) {
          backToList();
        }
      },
      onError: (error) => {
        setActionError(
          getMutationErrorMessage(error, "حذف آزمون ناموفق بود."),
        );
      },
    });
  }

  if (view === "form") {
    return (
      <div dir="rtl">
        <ExamFormView
          examId={editingExamId}
          onBack={backToList}
          onSaved={(id) => setEditingExamId(id)}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            آزمون آنلاین
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ایجاد و مدیریت آزمون‌های آنلاین با PDF و کلید پاسخ
          </p>
        </div>
        <Button onClick={openCreateForm} data-testid="new-online-exam-btn">
          <Plus size={16} aria-hidden="true" />
          آزمون جدید
        </Button>
      </div>

      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
      )}

      <Card className="overflow-hidden p-0" data-testid="online-exams-table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  عنوان
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  شروع
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  مدت
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  PDF
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton />}

              {!isLoading && !isError && sortedExams.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    هنوز آزمون آنلاینی ثبت نشده است.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                sortedExams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate font-medium text-slate-800 dark:text-white">
                        {exam.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{formatPersianDate(exam.start_at)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatPersianTime(exam.start_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {exam.duration_minutes.toLocaleString("fa-IR")} دقیقه
                    </td>
                    <td className="px-4 py-3">
                      <PdfBadge hasPdf={Boolean(exam.pdf_file_path)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(exam.id)}
                        >
                          ویرایش
                        </Button>
                        <Link
                          to={`/admin/online-exams/${exam.id}/results`}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg px-3 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        >
                          <BarChart3 size={14} aria-hidden="true" />
                          نتایج
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() => setExamToDelete(exam)}
                          aria-label={`حذف ${exam.title}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {isError && (
          <div className="p-6">
            <ErrorState
              message="خطا در بارگذاری لیست آزمون‌ها."
              onRetry={() => refetch()}
            />
          </div>
        )}

        {isFetching && !isLoading && (
          <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-700">
            در حال به‌روزرسانی...
          </p>
        )}
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(examToDelete)}
        onClose={() => {
          if (!deleteExam.isPending) {
            setExamToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteExam.isPending}
        title="حذف آزمون آنلاین"
        message={`آیا از حذف «${examToDelete?.title ?? ""}» و تمام تلاش‌های مرتبط مطمئن هستید؟`}
      />
    </div>
  );
}
