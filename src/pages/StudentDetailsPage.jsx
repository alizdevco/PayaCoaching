import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Plus,
  Trash2,
  Upload,
  User,
  Video,
} from "lucide-react";

import StudentProfileFields, {
  getProfileFieldStyles,
} from "../components/StudentProfileFields.jsx";
import JalaliDateInput from "../components/JalaliDateInput.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Modal, { ModalActions } from "../components/Modal.jsx";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";
import {
  formatPersianDate,
  formatPersianTime,
} from "../lib/persianDate.js";
import { useWarnOnLeave } from "../hooks/useWarnOnLeave.js";
import { useAddLink } from "../features/content/useAddLink.js";
import { getDownloadUrl } from "../features/content/contentApi.js";
import { useContentSignedUrl } from "../features/content/useContentSignedUrl.js";
import { useDeleteContent } from "../features/content/useDeleteContent.js";
import { useStudentContent } from "../features/content/useStudentContent.js";
import { useUploadContent } from "../features/content/useUploadContent.js";
import { useAddConsultation } from "../features/consultations/useAddConsultation.js";
import { useConsultations } from "../features/consultations/useConsultations.js";
import { useDeleteConsultation } from "../features/consultations/useDeleteConsultation.js";
import {
  useStudentProfile,
  useUpdateStudentProfile,
} from "../features/students/useStudentProfile.js";

const adminFieldStyles = getProfileFieldStyles("admin");

const TABS = [
  { id: "reports", label: "گزارش کار" },
  { id: "consultations", label: "تایم مشاوره" },
  { id: "content", label: "محتوا" },
];

const FILE_TYPE_LABELS = {
  video: "ویدیو",
  pdf: "PDF",
  image: "تصویر",
  link: "لینک",
  report: "گزارش",
};

const CONTENT_FILE_TYPES = new Set(["video", "pdf", "image", "link"]);

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function detectContentFileType(file) {
  if (file.type === "video/mp4") {
    return "video";
  }
  if (file.type === "application/pdf") {
    return "pdf";
  }
  if (file.type.startsWith("image/")) {
    return "image";
  }

  throw new Error("فرمت فایل پشتیبانی نمی‌شود. فقط ویدیو، PDF و تصویر مجاز است.");
}

function FileTypeBadge({ fileType }) {
  const icons = {
    video: Video,
    pdf: FileText,
    image: ImageIcon,
    link: Link2,
    report: FileText,
  };
  const Icon = icons[fileType] ?? FileText;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Icon size={12} aria-hidden="true" />
      {FILE_TYPE_LABELS[fileType] ?? fileType}
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function TabButton({ active, onClick, children, "data-testid": testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={[
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-emerald-500 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyTabState({ message }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
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

function ReportsTab({ studentId }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: contents = [], isLoading, isError, refetch } =
    useStudentContent(studentId);
  const uploadContent = useUploadContent();
  const deleteContent = useDeleteContent();

  useWarnOnLeave(uploadContent.isPending);

  const reports = useMemo(
    () =>
      contents
        .filter((item) => item.file_type === "report")
        .sort((a, b) => {
          const dateA = a.report_date ?? a.created_at;
          const dateB = b.report_date ?? b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }),
    [contents],
  );

  function resetUploadForm() {
    setTitle("");
    setReportDate("");
    setFile(null);
    setFormError("");
    setUploadProgress(0);
  }

  function closeUploadModal() {
    if (uploadContent.isPending) {
      return;
    }
    setIsUploadOpen(false);
    resetUploadForm();
  }

  function handleUploadSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("عنوان گزارش الزامی است.");
      return;
    }
    if (!reportDate) {
      setFormError("تاریخ گزارش الزامی است.");
      return;
    }
    if (!file) {
      setFormError("فایل PDF را انتخاب کنید.");
      return;
    }
    if (file.type !== "application/pdf") {
      setFormError("فقط فایل PDF مجاز است.");
      return;
    }

    uploadContent.mutate(
      {
        studentId,
        fileType: "report",
        file,
        title: title.trim(),
        reportDate,
        onProgress: setUploadProgress,
      },
      {
        onSuccess: () => {
          closeUploadModal();
        },
        onError: (error) => {
          setFormError(
            getMutationErrorMessage(error, "آپلود گزارش ناموفق بود."),
          );
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    deleteContent.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  }

  async function handleDownload(report) {
    setDownloadError("");
    setDownloadingId(report.id);
    try {
      const url = await getDownloadUrl(report.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadError(
        getMutationErrorMessage(error, "دانلود گزارش ناموفق بود."),
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          گزارش‌های PDF روزانه دانش‌آموز
        </p>
        <Button
          size="sm"
          onClick={() => {
            setUploadProgress(0);
            setIsUploadOpen(true);
          }}
          data-testid="upload-report-btn"
        >
          <Plus size={16} aria-hidden="true" />
          آپلود گزارش
        </Button>
      </div>

      {isLoading && <LoadingState message="در حال بارگذاری گزارش‌ها..." />}

      {isError && (
        <ErrorState
          message="خطا در بارگذاری گزارش‌ها."
          onRetry={() => refetch()}
        />
      )}

      {downloadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{downloadError}</p>
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <EmptyTabState message="هنوز گزارشی ثبت نشده است." />
      )}

      {!isLoading && !isError && reports.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-slate-800 dark:text-white">
                  {report.title}
                </p>
                <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar size={14} aria-hidden="true" />
                  {formatPersianDate(report.report_date)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={downloadingId === report.id}
                  onClick={() => handleDownload(report)}
                  aria-label={`دانلود ${report.title}`}
                >
                  <Download size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => setDeleteTarget(report)}
                  aria-label={`حذف ${report.title}`}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isUploadOpen}
        onClose={closeUploadModal}
        title="آپلود گزارش کار"
        data-testid="upload-report-modal"
        footer={
          <ModalActions
            onCancel={closeUploadModal}
            onConfirm={handleUploadSubmit}
            confirmLabel="آپلود"
            isLoading={uploadContent.isPending}
          />
        }
      >
        <form className="space-y-4" onSubmit={handleUploadSubmit}>
          <div>
            <label className={adminFieldStyles.label} htmlFor="report-upload-title">
              عنوان
            </label>
            <input
              id="report-upload-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={adminFieldStyles.input}
              placeholder="مثلاً گزارش هفته اول"
            />
          </div>
          <div>
            <label className={adminFieldStyles.label} htmlFor="report-upload-date">
              تاریخ گزارش
            </label>
            <JalaliDateInput
              id="report-upload-date"
              value={reportDate}
              onChange={setReportDate}
              className={adminFieldStyles.input}
            />
          </div>
          <div>
            <label className={adminFieldStyles.label} htmlFor="report-upload-file">
              فایل PDF
            </label>
            <input
              id="report-upload-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={adminFieldStyles.input}
            />
          </div>
          {uploadContent.isPending && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>در حال آپلود...</span>
                <span>{uploadProgress}٪</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteContent.isPending}
        title="حذف گزارش"
        message={`آیا از حذف «${deleteTarget?.title ?? ""}» مطمئن هستید؟`}
      />
    </div>
  );
}

function ConsultationsTab({ studentId, defaultConsultantName = "" }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const {
    data: consultations = [],
    isLoading,
    isError,
    refetch,
  } = useConsultations(studentId);
  const addConsultation = useAddConsultation();
  const deleteConsultation = useDeleteConsultation();

  function resetForm() {
    setConsultantName("");
    setDate("");
    setTime("");
    setFormError("");
  }

  function openAddModal() {
    setConsultantName(defaultConsultantName ?? "");
    setDate("");
    setTime("");
    setFormError("");
    setIsAddOpen(true);
  }

  function closeAddModal() {
    if (addConsultation.isPending) {
      return;
    }
    setIsAddOpen(false);
    resetForm();
  }

  function handleAddSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!consultantName.trim()) {
      setFormError("نام مشاور الزامی است.");
      return;
    }
    if (!date || !time) {
      setFormError("تاریخ و ساعت مشاوره الزامی است.");
      return;
    }

    addConsultation.mutate(
      { studentId, consultantName: consultantName.trim(), date, time },
      {
        onSuccess: () => closeAddModal(),
        onError: (error) => {
          setFormError(
            getMutationErrorMessage(error, "ثبت مشاوره ناموفق بود."),
          );
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    deleteConsultation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          تاریخچه مشاوره‌های تلفنی
        </p>
        <Button size="sm" onClick={openAddModal} data-testid="add-consultation-btn">
          <Plus size={16} aria-hidden="true" />
          افزودن مشاوره
        </Button>
      </div>

      {isLoading && <LoadingState message="در حال بارگذاری مشاوره‌ها..." />}

      {isError && (
        <ErrorState
          message="خطا در بارگذاری مشاوره‌ها."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && consultations.length === 0 && (
        <EmptyTabState message="هنوز مشاوره‌ای ثبت نشده است." />
      )}

      {!isLoading && !isError && consultations.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {consultations.map((consultation) => (
            <li
              key={consultation.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-1 font-medium text-slate-800 dark:text-white">
                  <User size={14} aria-hidden="true" />
                  {consultation.consultant_name}
                </p>
                <p className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <Calendar size={14} aria-hidden="true" />
                  {formatPersianDate(consultation.scheduled_at)}
                </p>
                <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <Clock size={14} aria-hidden="true" />
                  {formatPersianTime(consultation.scheduled_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => setDeleteTarget(consultation)}
                aria-label="حذف مشاوره"
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        title="افزودن مشاوره"
        data-testid="add-consultation-modal"
        footer={
          <ModalActions
            onCancel={closeAddModal}
            onConfirm={handleAddSubmit}
            confirmLabel="ثبت"
            isLoading={addConsultation.isPending}
          />
        }
      >
        <form className="space-y-4" onSubmit={handleAddSubmit}>
          <div>
            <label className={adminFieldStyles.label} htmlFor="consultation-add-name">
              نام مشاور
            </label>
            <input
              id="consultation-add-name"
              type="text"
              value={consultantName}
              onChange={(event) => setConsultantName(event.target.value)}
              className={adminFieldStyles.input}
              placeholder="نام مشاور"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminFieldStyles.label} htmlFor="consultation-add-date">
                زمان مشاوره
              </label>
              <JalaliDateInput
                id="consultation-add-date"
                value={date}
                onChange={setDate}
                className={adminFieldStyles.input}
              />
            </div>
            <div>
              <label className={adminFieldStyles.label} htmlFor="consultation-add-time">
                ساعت مشاوره
              </label>
              <input
                id="consultation-add-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={adminFieldStyles.input}
              />
            </div>
          </div>
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteConsultation.isPending}
        title="حذف مشاوره"
        message="آیا از حذف این رکورد مشاوره مطمئن هستید؟"
      />
    </div>
  );
}

function ContentTab({ studentId }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState("file");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openingContentId, setOpeningContentId] = useState(null);
  const [openError, setOpenError] = useState("");
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: contents = [], isLoading, isError, refetch } =
    useStudentContent(studentId);
  const uploadContent = useUploadContent();
  const addLink = useAddLink();
  const deleteContent = useDeleteContent();

  useWarnOnLeave(uploadContent.isPending);

  const {
    data: downloadUrl,
    isFetching: isOpening,
    isError: isOpenUrlError,
    error: openUrlError,
  } = useContentSignedUrl(openingContentId);

  const mediaItems = useMemo(
    () => contents.filter((item) => CONTENT_FILE_TYPES.has(item.file_type)),
    [contents],
  );

  useEffect(() => {
    if (!openingContentId || isOpening) {
      return;
    }

    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      setOpeningContentId(null);
      return;
    }

    if (isOpenUrlError) {
      setOpenError(
        getMutationErrorMessage(
          openUrlError,
          "دریافت لینک دانلود ناموفق بود.",
        ),
      );
      setOpeningContentId(null);
    }
  }, [
    openingContentId,
    downloadUrl,
    isOpening,
    isOpenUrlError,
    openUrlError,
  ]);

  function resetUploadForm() {
    setUploadMode("file");
    setTitle("");
    setUrl("");
    setFile(null);
    setFormError("");
    setUploadProgress(0);
  }

  function closeUploadModal() {
    if (uploadContent.isPending || addLink.isPending) {
      return;
    }
    setIsUploadOpen(false);
    resetUploadForm();
  }

  function handleUploadSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("عنوان الزامی است.");
      return;
    }

    if (uploadMode === "link") {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setFormError("آدرس لینک الزامی است.");
        return;
      }

      addLink.mutate(
        { studentId, title: title.trim(), url: trimmedUrl },
        {
          onSuccess: () => closeUploadModal(),
          onError: (error) => {
            setFormError(
              getMutationErrorMessage(error, "ثبت لینک ناموفق بود."),
            );
          },
        },
      );
      return;
    }

    if (!file) {
      setFormError("فایل را انتخاب کنید.");
      return;
    }

    let fileType;
    try {
      fileType = detectContentFileType(file);
    } catch (error) {
      setFormError(getMutationErrorMessage(error, "فرمت فایل نامعتبر است."));
      return;
    }

    uploadContent.mutate(
      {
        studentId,
        fileType,
        file,
        title: title.trim(),
        onProgress: setUploadProgress,
      },
      {
        onSuccess: () => closeUploadModal(),
        onError: (error) => {
          setFormError(
            getMutationErrorMessage(error, "آپلود محتوا ناموفق بود."),
          );
        },
      },
    );
  }

  function handleOpenContent(contentId) {
    setOpenError("");
    setOpeningContentId(contentId);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    deleteContent.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  }

  const isSubmitting = uploadContent.isPending || addLink.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          ویدیو، PDF، تصویر و لینک اختصاصی
        </p>
        <Button
          size="sm"
          onClick={() => {
            setUploadProgress(0);
            setIsUploadOpen(true);
          }}
          data-testid="add-content-btn"
        >
          <Upload size={16} aria-hidden="true" />
          افزودن محتوا
        </Button>
      </div>

      {openError && (
        <p className="text-sm text-red-600 dark:text-red-400">{openError}</p>
      )}

      {isOpening && (
        <LoadingState message="در حال آماده‌سازی لینک..." className="py-4" />
      )}

      {isLoading && <LoadingState message="در حال بارگذاری محتوا..." />}

      {isError && (
        <ErrorState
          message="خطا در بارگذاری محتوا."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && mediaItems.length === 0 && (
        <EmptyTabState message="هنوز محتوایی ثبت نشده است." />
      )}

      {!isLoading && !isError && mediaItems.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {mediaItems.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <button
                type="button"
                onClick={() => handleOpenContent(item.id)}
                disabled={isOpening}
                className="min-w-0 flex-1 rounded-lg text-right transition-colors hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-white">
                    {item.title}
                  </p>
                  <FileTypeBadge fileType={item.file_type} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <ExternalLink size={12} aria-hidden="true" />
                  {item.file_type === "link" ? "باز کردن لینک" : "مشاهده / دانلود"}
                </p>
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => setDeleteTarget(item)}
                aria-label={`حذف ${item.title}`}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isUploadOpen}
        onClose={closeUploadModal}
        title="افزودن محتوا"
        data-testid="add-content-modal"
        footer={
          <ModalActions
            onCancel={closeUploadModal}
            onConfirm={handleUploadSubmit}
            confirmLabel="ثبت"
            isLoading={isSubmitting}
          />
        }
      >
        <form className="space-y-4" onSubmit={handleUploadSubmit}>
          <div className="flex gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setUploadMode("file")}
              className={[
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                uploadMode === "file"
                  ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                  : "text-slate-600 dark:text-slate-300",
              ].join(" ")}
            >
              فایل
            </button>
            <button
              type="button"
              onClick={() => setUploadMode("link")}
              className={[
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                uploadMode === "link"
                  ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                  : "text-slate-600 dark:text-slate-300",
              ].join(" ")}
            >
              لینک
            </button>
          </div>

          <div>
            <label className={adminFieldStyles.label} htmlFor="content-add-title">
              عنوان
            </label>
            <input
              id="content-add-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={adminFieldStyles.input}
              placeholder="عنوان محتوا"
            />
          </div>

          {uploadMode === "file" ? (
            <div>
              <label className={adminFieldStyles.label} htmlFor="content-add-file">
                فایل
              </label>
              <input
                id="content-add-file"
                type="file"
                accept="video/mp4,application/pdf,image/jpeg,image/png,image/webp,.mp4,.pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={adminFieldStyles.input}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ویدیو (MP4)، PDF یا تصویر
              </p>
            </div>
          ) : (
            <div>
              <label className={adminFieldStyles.label} htmlFor="content-add-url">
                آدرس لینک
              </label>
              <input
                id="content-add-url"
                type="url"
                dir="ltr"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className={adminFieldStyles.input}
                placeholder="https://example.com"
              />
            </div>
          )}

          {uploadMode === "file" && uploadContent.isPending && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>در حال آپلود...</span>
                <span>{uploadProgress}٪</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteContent.isPending}
        title="حذف محتوا"
        message={`آیا از حذف «${deleteTarget?.title ?? ""}» مطمئن هستید؟`}
      />
    </div>
  );
}

export default function StudentDetailsPage() {
  const { student_id: studentId } = useParams();
  const [activeTab, setActiveTab] = useState("reports");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [locationIncomplete, setLocationIncomplete] = useState(false);

  const {
    data: student,
    isLoading,
    isError,
    refetch,
  } = useStudentProfile(studentId);

  const updateProfile = useUpdateStudentProfile();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm();

  useEffect(() => {
    if (!student) {
      return;
    }

    reset({
      firstName: student.first_name ?? "",
      lastName: student.last_name ?? "",
      province: student.province ?? "",
      city: student.city ?? "",
      consultantName: student.consultant_name ?? "",
      grade: student.grade ?? "",
      academicMajor: student.academic_major ?? "",
    });
    setLocationIncomplete(
      Boolean(student.province?.trim() && !student.city?.trim()),
    );
  }, [student, reset]);

  const cityValue = watch("city");

  useEffect(() => {
    if (cityValue?.trim()) {
      setLocationIncomplete(false);
    }
  }, [cityValue]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");
    updateProfile.mutate(
      { studentId, data: values },
      {
        onSuccess: () => {
          setSuccessMessage("تغییرات با موفقیت ذخیره شد.");
        },
        onError: (error) => {
          console.error("[updateStudentProfile]", error?.message);
          setServerError(getAuthMutationErrorMessage(error, "profile"));
        },
      },
    );
  }

  const fullName =
    [student?.first_name, student?.last_name].filter(Boolean).join(" ") ||
    "دانش‌آموز";

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/admin/students"
            className="mb-3 inline-flex items-center gap-1 text-sm text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <ArrowRight size={16} />
            بازگشت به لیست
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {isLoading ? "جزئیات دانش‌آموز" : fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            مدیریت محتوای اختصاصی و ویرایش پروفایل دانش‌آموز
          </p>
        </div>
      </div>

      {isError && (
        <ErrorState
          message="خطا در بارگذاری اطلاعات دانش‌آموز. لطفاً دوباره تلاش کنید."
          onRetry={() => refetch()}
        />
      )}

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">
          محتوای اختصاصی
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {activeTab === "reports" && <ReportsTab studentId={studentId} />}
        {activeTab === "consultations" && (
          <ConsultationsTab
            studentId={studentId}
            defaultConsultantName={student?.consultant_name ?? ""}
          />
        )}
        {activeTab === "content" && <ContentTab studentId={studentId} />}
      </Card>

      {!isError && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">
            ویرایش پروفایل
          </h2>
          {isLoading ? (
            <ProfileSkeleton />
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4 sm:grid-cols-2"
              noValidate
            >
              <div className="sm:col-span-2">
                <label className={adminFieldStyles.label} htmlFor="profile-phone">
                  شماره موبایل
                </label>
                <input
                  id="profile-phone"
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={student?.phone ?? "—"}
                  className={adminFieldStyles.readOnly}
                  aria-readonly="true"
                />
              </div>

              {locationIncomplete && (
                <div
                  className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                  role="status"
                >
                  استان ثبت شده اما شهر انتخاب نشده است. می‌توانید سایر فیلدها را
                  ذخیره کنید؛ برای تکمیل پروفایل، شهر را انتخاب کنید.
                </div>
              )}

              <StudentProfileFields
                register={register}
                control={control}
                errors={errors}
                watch={watch}
                setValue={setValue}
                variant="admin"
                dirtyFields={dirtyFields}
                showIncompleteCityHint={locationIncomplete}
              />

              {successMessage && (
                <div
                  className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  role="status"
                >
                  <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
                  <span>{successMessage}</span>
                </div>
              )}

              {serverError && (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">
                  {serverError}
                </p>
              )}

              <div className="sm:col-span-2">
                <Button type="submit" isLoading={updateProfile.isPending} data-testid="profile-save-btn">
                  ذخیره تغییرات
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
