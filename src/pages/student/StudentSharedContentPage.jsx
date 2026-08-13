import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Video,
} from "lucide-react";

import ErrorState from "../../components/ErrorState.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import { useContentSignedUrl } from "../../features/content/useContentSignedUrl.js";
import { useOwnStudentContent } from "../../features/content/useOwnStudentContent.js";

const FILE_TYPE_LABELS = {
  video: "ویدیو",
  pdf: "PDF",
  image: "تصویر",
  link: "لینک",
};

const SHARED_CONTENT_TYPES = new Set(["video", "pdf", "image", "link"]);

function FileTypeBadge({ fileType }) {
  const icons = {
    video: Video,
    pdf: FileText,
    image: ImageIcon,
    link: Link2,
  };
  const Icon = icons[fileType] ?? FileText;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Icon size={12} aria-hidden="true" />
      {FILE_TYPE_LABELS[fileType] ?? fileType}
    </span>
  );
}

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function StudentSharedContentPage() {
  const [openingContentId, setOpeningContentId] = useState(null);
  const [openError, setOpenError] = useState("");

  const { data: contents = [], isLoading, isError, refetch } =
    useOwnStudentContent();

  const sharedItems = useMemo(
    () => contents.filter((item) => SHARED_CONTENT_TYPES.has(item.file_type)),
    [contents],
  );

  const {
    data: downloadUrl,
    isFetching: isOpening,
    isError: isOpenUrlError,
    error: openUrlError,
  } = useContentSignedUrl(openingContentId);

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
        getMutationErrorMessage(openUrlError, "دریافت لینک دانلود ناموفق بود."),
      );
      setOpeningContentId(null);
    }
  }, [openingContentId, downloadUrl, isOpening, isOpenUrlError, openUrlError]);

  function handleOpenContent(contentId) {
    setOpenError("");
    setOpeningContentId(contentId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          محتوای اختصاصی
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ویدیو، PDF، تصویر و لینک‌های اختصاصی که برای شما ثبت شده است.
        </p>
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

      {!isLoading && !isError && sharedItems.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          هنوز محتوایی برای شما ثبت نشده است.
        </p>
      )}

      {!isLoading && !isError && sharedItems.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {sharedItems.map((item) => (
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
