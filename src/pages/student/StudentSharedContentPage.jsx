import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Video,
} from "lucide-react";

import Card from "../../components/Card.jsx";
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

const TYPE_FILTERS = [
  { value: "all", label: "همه" },
  { value: "link", label: "لینک", icon: Link2 },
  { value: "video", label: "ویدیو", icon: Video },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "image", label: "تصویر", icon: ImageIcon },
];

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

function ContentTypeFilters({ value, onChange }) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="فیلتر نوع محتوا"
    >
      {TYPE_FILTERS.map((filter) => {
        const Icon = filter.icon;
        const isActive = value === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            data-testid={`content-filter-${filter.value}`}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60",
            ].join(" ")}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

function ContentCard({ item, onOpen, disabled }) {
  return (
    <Card className="admin-stagger-in flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">
          {item.title}
        </h2>
        <FileTypeBadge fileType={item.file_type} />
      </div>

      <button
        type="button"
        onClick={() => onOpen(item.id)}
        disabled={disabled}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
      >
        <ExternalLink size={14} aria-hidden="true" />
        {item.file_type === "link" ? "باز کردن لینک" : "مشاهده / دانلود"}
      </button>
    </Card>
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
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: contents = [], isLoading, isError, refetch } =
    useOwnStudentContent();

  const sharedItems = useMemo(
    () => contents.filter((item) => SHARED_CONTENT_TYPES.has(item.file_type)),
    [contents],
  );

  const filteredItems = useMemo(() => {
    if (typeFilter === "all") {
      return sharedItems;
    }
    return sharedItems.filter((item) => item.file_type === typeFilter);
  }, [sharedItems, typeFilter]);

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

      {!isLoading && !isError && sharedItems.length > 0 && (
        <ContentTypeFilters value={typeFilter} onChange={setTypeFilter} />
      )}

      {!isLoading && !isError && sharedItems.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          هنوز محتوایی برای شما ثبت نشده است.
        </p>
      )}

      {!isLoading && !isError && sharedItems.length > 0 && filteredItems.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          محتوایی با این فیلتر یافت نشد.
        </p>
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <ContentCard
                item={item}
                onOpen={handleOpenContent}
                disabled={isOpening}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
