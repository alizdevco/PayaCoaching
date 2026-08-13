import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { getProfileFieldStyles } from "../components/StudentProfileFields.jsx";
import JalaliDateInput from "../components/JalaliDateInput.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Modal, { ModalActions } from "../components/Modal.jsx";
import { formatExamDate } from "../lib/persianDate.js";
import { useWarnOnLeave } from "../hooks/useWarnOnLeave.js";
import { useExamList } from "../features/exams/useExamList.js";
import { useExamAnalysis } from "../features/exams/useExamAnalysis.js";
import {
  useCreateExam,
  useDeleteExam,
  usePublishExam,
  useUnpublishExam,
  useUpdateExam,
} from "../features/exams/useExamMutations.js";
import {
  useDeleteExamFile,
  useUploadExamFile,
} from "../features/exams/useExamFileMutations.js";

const adminFieldStyles = getProfileFieldStyles("admin");

const SKELETON_ROWS = 4;

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function isUniqueViolation(error) {
  const code = error?.code ?? error?.cause?.code;
  return code === "23505";
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PublishBadge({ isPublished }) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Eye size={12} aria-hidden="true" />
        منتشر شده
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <EyeOff size={12} aria-hidden="true" />
      پیش‌نویس
    </span>
  );
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

function UploadProgressBar({ progress, label }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{progress}٪</span>
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

function FileListSection({
  title,
  icon: Icon,
  files,
  emptyMessage,
  onDelete,
  deletingFileId,
  accept,
  onFilesSelected,
  isUploading,
  uploadProgress,
  uploadLabel,
}) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <Icon size={16} aria-hidden="true" />
          {title}
        </h3>
        <Button
          size="sm"
          variant="secondary"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} aria-hidden="true" />
          افزودن فایل
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files;
            if (selected?.length) {
              onFilesSelected(selected);
            }
            event.target.value = "";
          }}
        />
      </div>

      {isUploading && (
        <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
      )}

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">
                    {file.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
                {file.file_type === "video" && (
                  <video
                    controls
                    preload="metadata"
                    src={file.public_url}
                    className="max-h-48 w-full rounded-lg bg-black"
                  >
                    مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                  </video>
                )}
                {file.file_type === "pdf" && (
                  <a
                    href={file.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    مشاهده PDF
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                isLoading={deletingFileId === file.id}
                onClick={() => onDelete(file)}
                aria-label={`حذف ${file.title}`}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExamFormView({ examDate, onBack, onSaved }) {
  const isEditMode = Boolean(examDate);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savedExamId, setSavedExamId] = useState(null);
  const [savedExamDate, setSavedExamDate] = useState(examDate ?? "");
  const [fileError, setFileError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);

  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const uploadExamFile = useUploadExamFile();
  const deleteExamFile = useDeleteExamFile();

  const queryExamDate = savedExamDate || examDate || "";

  const {
    data: examDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useExamAnalysis(queryExamDate);

  const activeExamDate =
    savedExamDate || examDate || examDetail?.exam_date || "";
  const examId = savedExamId ?? examDetail?.id ?? null;
  const canManageFiles = Boolean(examId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      examDate: "",
      title: "",
      description: "",
      content: "",
      isPublished: false,
    },
  });

  useWarnOnLeave(isUploadingFiles || uploadExamFile.isPending);

  useEffect(() => {
    if (!examDetail) {
      return;
    }

    reset({
      examDate: examDetail.exam_date,
      title: examDetail.title ?? "",
      description: examDetail.description ?? "",
      content: examDetail.content ?? "",
      isPublished: examDetail.is_published ?? false,
    });
  }, [examDetail, reset]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const videos = useMemo(
    () => (examDetail?.files ?? []).filter((file) => file.file_type === "video"),
    [examDetail?.files],
  );

  const pdfs = useMemo(
    () => (examDetail?.files ?? []).filter((file) => file.file_type === "pdf"),
    [examDetail?.files],
  );

  const isSaving = createExam.isPending || updateExam.isPending;

  function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");

    const payload = {
      examDate: values.examDate,
      title: values.title,
      content: values.content,
      description: values.description,
      isPublished: values.isPublished,
    };

    if (canManageFiles) {
      updateExam.mutate(
        { examId, ...payload },
        {
          onSuccess: (data) => {
            setSuccessMessage("تغییرات با موفقیت ذخیره شد.");
            setSavedExamDate(data.exam_date);
            onSaved?.(data.exam_date);
          },
          onError: (error) => {
            if (isUniqueViolation(error)) {
              setServerError("تحلیل آزمونی با این تاریخ از قبل وجود دارد.");
              return;
            }
            setServerError(
              getMutationErrorMessage(error, "ذخیره تحلیل آزمون ناموفق بود."),
            );
          },
        },
      );
      return;
    }

    createExam.mutate(payload, {
      onSuccess: (data) => {
        setSavedExamId(data.id);
        setSavedExamDate(data.exam_date);
        setSuccessMessage("تحلیل آزمون ایجاد شد. اکنون می‌توانید فایل آپلود کنید.");
        onSaved?.(data.exam_date);
      },
      onError: (error) => {
        if (isUniqueViolation(error)) {
          setServerError("تحلیل آزمونی با این تاریخ از قبل وجود دارد.");
          return;
        }
        setServerError(
          getMutationErrorMessage(error, "ایجاد تحلیل آزمون ناموفق بود."),
        );
      },
    });
  }

  async function handleFilesSelected(fileType, fileList) {
    if (!examId || !activeExamDate) {
      setFileError("ابتدا تحلیل آزمون را ذخیره کنید.");
      return;
    }

    const files = Array.from(fileList);
    if (files.length === 0) {
      return;
    }

    setFileError("");
    setIsUploadingFiles(true);
    setUploadProgress(0);

    const expectedMime =
      fileType === "video" ? "video/mp4" : "application/pdf";

    for (const file of files) {
      if (file.type !== expectedMime) {
        setFileError(
          fileType === "video"
            ? "فقط فایل MP4 مجاز است."
            : "فقط فایل PDF مجاز است.",
        );
        setIsUploadingFiles(false);
        return;
      }
    }

    try {
      for (const file of files) {
        setUploadProgress(0);
        await uploadExamFile.mutateAsync({
          examAnalysisId: examId,
          examDate: activeExamDate,
          fileType,
          file,
          title: file.name.replace(/\.[^.]+$/, ""),
          onProgress: setUploadProgress,
        });
      }
      setSuccessMessage(
        files.length > 1 ? "فایل‌ها با موفقیت آپلود شدند." : "فایل با موفقیت آپلود شد.",
      );
    } catch (error) {
      setFileError(getMutationErrorMessage(error, "آپلود فایل ناموفق بود."));
    } finally {
      setIsUploadingFiles(false);
      setUploadProgress(0);
    }
  }

  function handleDeleteFileConfirm() {
    if (!fileToDelete) {
      return;
    }

    setDeletingFileId(fileToDelete.id);
    deleteExamFile.mutate(
      { fileId: fileToDelete.id, examDate: activeExamDate },
      {
        onSuccess: () => {
          setFileToDelete(null);
        },
        onError: (error) => {
          setFileError(
            getMutationErrorMessage(error, "حذف فایل ناموفق بود."),
          );
        },
        onSettled: () => {
          setDeletingFileId(null);
        },
      },
    );
  }

  const pageTitle = isEditMode || canManageFiles ? "ویرایش تحلیل آزمون" : "آزمون جدید";

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          disabled={isUploadingFiles || uploadExamFile.isPending}
          className="mb-3 inline-flex items-center gap-1 text-sm text-emerald-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowRight size={16} />
          بازگشت به لیست
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {pageTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {canManageFiles
            ? "ویرایش متن تحلیل و مدیریت فایل‌های ویدیو و PDF"
            : "اطلاعات تحلیل را وارد کنید و سپس فایل‌ها را آپلود کنید"}
        </p>
      </div>

      {isEditMode && isDetailLoading && !examDetail && !canManageFiles && (
        <LoadingState message="در حال بارگذاری تحلیل آزمون..." />
      )}

      {isEditMode && isDetailError && !canManageFiles && (
        <ErrorState
          message="خطا در بارگذاری تحلیل آزمون."
          onRetry={() => refetchDetail()}
        />
      )}

      {(!isEditMode || examDetail || canManageFiles) && (
        <>
          <Card>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} data-testid="exam-form">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={adminFieldStyles.label} htmlFor="examDate">
                    تاریخ آزمون
                  </label>
                  <Controller
                    name="examDate"
                    control={control}
                    rules={{ required: "تاریخ آزمون الزامی است." }}
                    render={({ field }) => (
                      <JalaliDateInput
                        id="examDate"
                        className={adminFieldStyles.input}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.examDate && (
                    <p className={adminFieldStyles.error}>
                      {errors.examDate.message}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <label
                    htmlFor="exam-is-published"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 dark:border-slate-700"
                  >
                    <input
                      id="exam-is-published"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      {...register("isPublished")}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      منتشر شده (قابل مشاهده عمومی)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className={adminFieldStyles.label} htmlFor="title">
                  عنوان
                </label>
                <input
                  id="title"
                  type="text"
                  className={adminFieldStyles.input}
                  placeholder="مثلاً تحلیل آزمون ۱۵ مرداد"
                  {...register("title", { required: "عنوان الزامی است." })}
                />
                {errors.title && (
                  <p className={adminFieldStyles.error}>{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className={adminFieldStyles.label} htmlFor="description">
                  توضیح کوتاه (اختیاری)
                </label>
                <input
                  id="description"
                  type="text"
                  className={adminFieldStyles.input}
                  placeholder="خلاصه‌ای کوتاه برای نمایش در لیست"
                  {...register("description")}
                />
              </div>

              <div>
                <label className={adminFieldStyles.label} htmlFor="content">
                  متن تحلیل
                </label>
                <textarea
                  id="content"
                  rows={8}
                  className={adminFieldStyles.input}
                  placeholder="متن کامل تحلیل آزمون..."
                  {...register("content", { required: "متن تحلیل الزامی است." })}
                />
                {errors.content && (
                  <p className={adminFieldStyles.error}>
                    {errors.content.message}
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

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" isLoading={isSaving}>
                  {canManageFiles ? "ذخیره تغییرات" : "ایجاد تحلیل"}
                </Button>
                {canManageFiles && examDetail?.is_published && (
                  <Link
                    to={`/exam-analysis/${activeExamDate}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <ExternalLink size={14} />
                    مشاهده صفحه عمومی
                  </Link>
                )}
              </div>
            </form>
          </Card>

          {canManageFiles && (
            <Card className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  فایل‌های تحلیل
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  ویدیوهای MP4 و فایل‌های PDF را می‌توانید چندتایی آپلود کنید.
                </p>
              </div>

              {fileError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {fileError}
                </p>
              )}

              <FileListSection
                title="ویدیوها"
                icon={Video}
                files={videos}
                emptyMessage="هنوز ویدیویی آپلود نشده است."
                accept="video/mp4,.mp4"
                onFilesSelected={(fileList) =>
                  handleFilesSelected("video", fileList)
                }
                onDelete={setFileToDelete}
                deletingFileId={deletingFileId}
                isUploading={isUploadingFiles && uploadExamFile.isPending}
                uploadProgress={uploadProgress}
                uploadLabel="در حال آپلود ویدیو..."
              />

              <FileListSection
                title="فایل‌های PDF"
                icon={FileText}
                files={pdfs}
                emptyMessage="هنوز PDF آپلود نشده است."
                accept="application/pdf,.pdf"
                onFilesSelected={(fileList) =>
                  handleFilesSelected("pdf", fileList)
                }
                onDelete={setFileToDelete}
                deletingFileId={deletingFileId}
                isUploading={isUploadingFiles && uploadExamFile.isPending}
                uploadProgress={uploadProgress}
                uploadLabel="در حال آپلود PDF..."
              />
            </Card>
          )}
        </>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(fileToDelete)}
        onClose={() => {
          if (!deleteExamFile.isPending) {
            setFileToDelete(null);
          }
        }}
        onConfirm={handleDeleteFileConfirm}
        isLoading={deleteExamFile.isPending}
        title="حذف فایل"
        message={`آیا از حذف «${fileToDelete?.title ?? ""}» مطمئن هستید؟`}
      />
    </div>
  );
}

export default function ExamManagementPage() {
  const [view, setView] = useState("list");
  const [editingExamDate, setEditingExamDate] = useState(null);
  const [examToDelete, setExamToDelete] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data: exams = [], isLoading, isError, refetch, isFetching } =
    useExamList();

  const deleteExam = useDeleteExam();
  const publishExam = usePublishExam();
  const unpublishExam = useUnpublishExam();

  function openCreateForm() {
    setEditingExamDate(null);
    setView("form");
  }

  function openEditForm(examDate) {
    setEditingExamDate(examDate);
    setView("form");
  }

  function backToList() {
    setView("list");
    setEditingExamDate(null);
  }

  function handlePublishToggle(exam) {
    setActionError("");
    const mutation = exam.is_published ? unpublishExam : publishExam;

    mutation.mutate(exam.id, {
      onError: (error) => {
        setActionError(
          getMutationErrorMessage(
            error,
            exam.is_published
              ? "لغو انتشار ناموفق بود."
              : "انتشار ناموفق بود.",
          ),
        );
      },
    });
  }

  function handleDeleteConfirm() {
    if (!examToDelete) {
      return;
    }

    setActionError("");
    deleteExam.mutate(examToDelete.id, {
      onSuccess: () => {
        setExamToDelete(null);
        if (editingExamDate === examToDelete.exam_date) {
          backToList();
        }
      },
      onError: (error) => {
        setActionError(
          getMutationErrorMessage(error, "حذف تحلیل آزمون ناموفق بود."),
        );
      },
    });
  }

  if (view === "form") {
    return (
      <div dir="rtl">
        <ExamFormView
          examDate={editingExamDate}
          onBack={backToList}
          onSaved={(date) => setEditingExamDate(date)}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            تحلیل آزمون
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            مدیریت تحلیل‌های آزمون، فایل‌های چندرسانه‌ای و وضعیت انتشار
          </p>
        </div>
        <Button onClick={openCreateForm} data-testid="new-exam-btn">
          <Plus size={16} aria-hidden="true" />
          آزمون جدید
        </Button>
      </div>

      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
      )}

      <Card className="overflow-hidden p-0" data-testid="exams-table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  تاریخ آزمون
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  عنوان
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  وضعیت
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                  ویدیو
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

              {!isLoading && !isError && exams.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    هنوز تحلیل آزمونی ثبت نشده است.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                      {formatExamDate(exam.exam_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate font-medium text-slate-800 dark:text-white">
                        {exam.title}
                      </div>
                      {exam.description && (
                        <div className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                          {exam.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PublishBadge isPublished={exam.is_published} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {(exam.videoCount ?? 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {(exam.pdfCount ?? 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(exam.exam_date)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublishToggle(exam)}
                          isLoading={
                            (publishExam.isPending ||
                              unpublishExam.isPending) &&
                            (publishExam.variables === exam.id ||
                              unpublishExam.variables === exam.id)
                          }
                        >
                          {exam.is_published ? "لغو انتشار" : "انتشار"}
                        </Button>
                        {exam.is_published && (
                          <Link
                            to={`/exam-analysis/${exam.exam_date}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            aria-label="مشاهده صفحه عمومی"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        )}
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
              message="خطا در بارگذاری لیست تحلیل‌ها."
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
        title="حذف تحلیل آزمون"
        message={`آیا از حذف «${examToDelete?.title ?? ""}» و تمام فایل‌های مرتبط مطمئن هستید؟`}
      />
    </div>
  );
}
