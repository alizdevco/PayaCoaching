import { useMemo, useState } from "react";
import { Calendar, Download, FileText, Plus, Trash2 } from "lucide-react";

import Button from "../../components/Button.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import JalaliDatePicker from "../../components/JalaliDatePicker.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import Modal, { ModalActions } from "../../components/Modal.jsx";
import { getProfileFieldStyles } from "../../components/StudentProfileFields.jsx";
import { useAuth } from "../../features/auth/useAuth.js";
import {
  getWorkReportDisplayTitle,
  getWorkReportDownloadUrl,
  MAX_WORK_REPORT_BYTES,
} from "../../features/work-reports/workReportsApi.js";
import { useDeleteWorkReport } from "../../features/work-reports/useDeleteWorkReport.js";
import { useOwnWorkReports } from "../../features/work-reports/useOwnWorkReports.js";
import { useUploadWorkReport } from "../../features/work-reports/useUploadWorkReport.js";
import { useWarnOnLeave } from "../../hooks/useWarnOnLeave.js";
import { formatPersianDate } from "../../lib/persianDate.js";
import {
  isSafeExternalUrl,
  UNSAFE_LINK_OPEN_MESSAGE,
} from "../../utils/urlValidation.js";

const fieldStyles = getProfileFieldStyles("admin");

const PDF_MIME = "application/pdf";

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
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
      data-testid="delete-work-report-modal"
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

export default function StudentWorkReportsPage() {
  const { session } = useAuth();
  const studentId = session?.user?.id ?? null;

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    data: reports = [],
    isLoading,
    isError,
    refetch,
  } = useOwnWorkReports();
  const uploadWorkReport = useUploadWorkReport();
  const deleteWorkReport = useDeleteWorkReport();

  useWarnOnLeave(uploadWorkReport.isPending);

  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        const dateA = a.report_date ?? a.created_at;
        const dateB = b.report_date ?? b.created_at;
        return String(dateB).localeCompare(String(dateA));
      }),
    [reports],
  );

  function resetUploadForm() {
    setTitle("");
    setDescription("");
    setReportDate("");
    setFile(null);
    setFormError("");
    setUploadProgress(0);
  }

  function closeUploadModal() {
    if (uploadWorkReport.isPending) {
      return;
    }
    setIsUploadOpen(false);
    resetUploadForm();
  }

  function handleUploadSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!reportDate) {
      setFormError("تاریخ گزارش الزامی است.");
      return;
    }
    if (!file) {
      setFormError("فایل PDF را انتخاب کنید.");
      return;
    }
    if (file.type !== PDF_MIME) {
      setFormError("فقط فایل PDF مجاز است.");
      return;
    }
    if (file.size > MAX_WORK_REPORT_BYTES) {
      setFormError("حجم فایل بیش از حد مجاز (۵۰۰ مگابایت) است.");
      return;
    }

    uploadWorkReport.mutate(
      {
        studentId,
        file,
        title: title.trim(),
        description: description.trim(),
        reportDate,
        onProgress: setUploadProgress,
      },
      {
        onSuccess: () => {
          closeUploadModal();
        },
        onError: (error) => {
          setUploadProgress(0);
          setFormError(
            getMutationErrorMessage(error, "آپلود گزارش کار ناموفق بود."),
          );
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    deleteWorkReport.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  }

  async function handleDownload(report) {
    setDownloadError("");
    setDownloadingId(report.id);
    try {
      const url = await getWorkReportDownloadUrl(report.id);
      if (!isSafeExternalUrl(url)) {
        setDownloadError(UNSAFE_LINK_OPEN_MESSAGE);
        return;
      }
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          گزارش کار من
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          گزارش‌های کاری خود را آپلود، مشاهده و مدیریت کنید.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            گزارش‌های PDF روزانه شما
          </p>
          <Button
            size="sm"
            onClick={() => {
              setUploadProgress(0);
              setIsUploadOpen(true);
            }}
            data-testid="upload-work-report-btn"
          >
            <Plus size={16} aria-hidden="true" />
            ثبت گزارش جدید
          </Button>
        </div>

        {isLoading && <LoadingState message="در حال بارگذاری گزارش‌ها..." />}

        {!isLoading && isError && (
          <ErrorState
            message="خطا در بارگذاری گزارش‌ها."
            onRetry={() => refetch()}
          />
        )}

        {downloadError && (
          <p className="text-sm text-red-600 dark:text-red-400">{downloadError}</p>
        )}

        {!isLoading && !isError && sortedReports.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            هنوز گزارش کاری ثبت نکرده‌اید.
          </p>
        )}

        {!isLoading && !isError && sortedReports.length > 0 && (
          <ul
            className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700"
            data-testid="work-reports-list"
          >
            {sortedReports.map((report) => {
              const displayTitle = getWorkReportDisplayTitle(report);

              return (
                <li
                  key={report.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                  data-testid={`work-report-item-${report.id}`}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-white">
                      <FileText size={14} aria-hidden="true" />
                      {displayTitle}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Calendar size={14} aria-hidden="true" />
                      {formatPersianDate(report.report_date)}
                    </p>
                    {report.description?.trim() && (
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {report.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={downloadingId === report.id}
                      onClick={() => handleDownload(report)}
                      aria-label={`دانلود ${displayTitle}`}
                      data-testid={`download-work-report-${report.id}`}
                    >
                      <Download size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => setDeleteTarget(report)}
                      aria-label={`حذف ${displayTitle}`}
                      data-testid={`delete-work-report-${report.id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        isOpen={isUploadOpen}
        onClose={closeUploadModal}
        title="ثبت گزارش کار"
        data-testid="upload-work-report-modal"
        footer={
          <ModalActions
            onCancel={closeUploadModal}
            onConfirm={handleUploadSubmit}
            confirmLabel="آپلود"
            isLoading={uploadWorkReport.isPending}
          />
        }
      >
        <form className="space-y-4" onSubmit={handleUploadSubmit}>
          <div>
            <label className={fieldStyles.label} htmlFor="work-report-upload-date">
              تاریخ گزارش کار
            </label>
            <JalaliDatePicker
              id="work-report-upload-date"
              value={reportDate}
              onChange={setReportDate}
              className={fieldStyles.input}
              placeholder="انتخاب تاریخ"
            />
          </div>
          <div>
            <label className={fieldStyles.label} htmlFor="work-report-upload-title">
              عنوان (اختیاری)
            </label>
            <input
              id="work-report-upload-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldStyles.input}
              placeholder="مثلاً گزارش هفته اول"
            />
          </div>
          <div>
            <label
              className={fieldStyles.label}
              htmlFor="work-report-upload-description"
            >
              توضیحات (اختیاری)
            </label>
            <textarea
              id="work-report-upload-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldStyles.input}
              rows={3}
              placeholder="توضیحات تکمیلی درباره گزارش"
            />
          </div>
          <div>
            <label className={fieldStyles.label} htmlFor="work-report-upload-file">
              فایل PDF
            </label>
            <input
              id="work-report-upload-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={fieldStyles.input}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              فقط PDF، حداکثر ۵۰۰ مگابایت
            </p>
          </div>
          {uploadWorkReport.isPending && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
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
        isLoading={deleteWorkReport.isPending}
        title="حذف گزارش کار"
        message={`آیا از حذف «${deleteTarget ? getWorkReportDisplayTitle(deleteTarget) : ""}» مطمئن هستید؟`}
      />
    </div>
  );
}
