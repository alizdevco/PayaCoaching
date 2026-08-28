import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Calendar, Clock, Download, FilePlus, User } from "lucide-react";

import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import { getDownloadUrl } from "../../features/content/contentApi.js";
import { useOwnConsultations } from "../../features/consultations/useOwnConsultations.js";
import { useOwnStudentContent } from "../../features/content/useOwnStudentContent.js";
import {
  formatPersianDate,
  formatPersianTime,
} from "../../lib/persianDate.js";
import {
  isSafeExternalUrl,
  UNSAFE_LINK_OPEN_MESSAGE,
} from "../../utils/urlValidation.js";

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function StudentReportsPage() {
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const {
    data: contents = [],
    isLoading: isContentLoading,
    isError: isContentError,
    refetch: refetchContent,
  } = useOwnStudentContent();

  const {
    data: consultations = [],
    isLoading: isConsultationsLoading,
    isError: isConsultationsError,
    refetch: refetchConsultations,
  } = useOwnConsultations();

  const reports = useMemo(
    () =>
      contents
        .filter((item) => item.file_type === "report")
        .sort((a, b) => {
          const dateA = a.report_date ?? a.created_at;
          const dateB = b.report_date ?? b.created_at;
          return String(dateB).localeCompare(String(dateA));
        }),
    [contents],
  );

  const isLoading = isContentLoading || isConsultationsLoading;
  const isError = isContentError || isConsultationsError;

  async function handleDownload(report) {
    setDownloadError("");
    setDownloadingId(report.id);
    try {
      const url = await getDownloadUrl(report.id);
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

  function handleRetry() {
    refetchContent();
    refetchConsultations();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          گزارش مشاور و مشاوره
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          گزارش‌های ثبت‌شده توسط مشاور و تاریخچه مشاوره‌های تلفنی شما.
        </p>
      </div>

      {isLoading && <LoadingState message="در حال بارگذاری..." />}

      {!isLoading && isError && (
        <ErrorState message="خطا در بارگذاری اطلاعات." onRetry={handleRetry} />
      )}

      {!isLoading && !isError && (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                گزارش‌های ثبت‌شده توسط مشاور
              </h2>
              <Link
                to="/student/work-reports"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                data-testid="go-to-my-work-reports"
              >
                <FilePlus size={14} aria-hidden="true" />
                گزارش کار من
              </Link>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              این گزارش‌ها توسط مشاور برای شما آپلود شده‌اند. برای ثبت گزارش
              کار خودتان به بخش «گزارش کار من» بروید.
            </p>

            {downloadError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {downloadError}
              </p>
            )}

            {reports.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                هنوز گزارشی برای شما ثبت نشده است.
              </p>
            ) : (
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
                      {report.report_date && (
                        <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                          <Calendar size={14} aria-hidden="true" />
                          {formatPersianDate(report.report_date)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={downloadingId === report.id}
                      onClick={() => handleDownload(report)}
                      aria-label={`دانلود ${report.title}`}
                    >
                      <Download size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              مشاوره‌های تلفنی
            </h2>

            {consultations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                هنوز مشاوره‌ای ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-3">
                {consultations.map((consultation) => (
                  <li key={consultation.id}>
                    <Card className="space-y-2">
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
                      {consultation.notes && (
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {consultation.notes}
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
