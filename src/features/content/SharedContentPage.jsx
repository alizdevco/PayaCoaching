import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Link2,
  Upload,
  Video,
} from "lucide-react";

import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import { getProfileFieldStyles } from "../../components/StudentProfileFields.jsx";
import { useWarnOnLeave } from "../../hooks/useWarnOnLeave.js";
import { useUploadSharedContent } from "./useUploadSharedContent.js";

const adminFieldStyles = getProfileFieldStyles("admin");

const CONTENT_TYPES = [
  {
    value: "video",
    label: "ویدیو",
    icon: Video,
    accept: "video/mp4,.mp4",
    hint: "فقط MP4، حداکثر ۱ گیگابایت",
    mimes: ["video/mp4"],
  },
  {
    value: "pdf",
    label: "PDF",
    icon: FileText,
    accept: "application/pdf,.pdf",
    hint: "فقط PDF، حداکثر ۵۰ مگابایت",
    mimes: ["application/pdf"],
  },
  {
    value: "image",
    label: "تصویر",
    icon: ImageIcon,
    accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
    hint: "JPG، PNG یا WEBP، حداکثر ۲۰ مگابایت",
    mimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  {
    value: "report",
    label: "گزارش",
    icon: FileText,
    accept: "application/pdf,.pdf",
    hint: "فقط PDF، حداکثر ۵۰ مگابایت",
    mimes: ["application/pdf"],
  },
  {
    value: "link",
    label: "لینک",
    icon: Link2,
    isLink: true,
  },
];

function getMutationErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function UploadProgressBar({ progress }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>در حال آپلود...</span>
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

export default function SharedContentPage() {
  const [contentType, setContentType] = useState("video");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const uploadSharedContent = useUploadSharedContent();

  useWarnOnLeave(uploadSharedContent.isPending);

  const selectedType = CONTENT_TYPES.find((type) => type.value === contentType);

  function resetForm() {
    setTitle("");
    setFile(null);
    setUrl("");
    setUploadProgress(0);
  }

  const isLinkType = selectedType?.isLink === true;

  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!title.trim()) {
      setFormError("عنوان الزامی است.");
      return;
    }
    if (isLinkType) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setFormError("آدرس لینک الزامی است.");
        return;
      }
    } else {
      if (!file) {
        setFormError("فایل را انتخاب کنید.");
        return;
      }
      if (selectedType && !selectedType.mimes.includes(file.type)) {
        setFormError(`فرمت فایل با نوع محتوای «${selectedType.label}» مطابقت ندارد.`);
        return;
      }
    }

    uploadSharedContent.mutate(
      {
        fileType: contentType,
        file,
        title: title.trim(),
        url: url.trim(),
        onProgress: setUploadProgress,
      },
      {
        onSuccess: (data) => {
          setSuccessMessage(
            isLinkType
              ? `لینک با موفقیت ثبت شد و برای ${data?.student_count ?? 0} دانش‌آموز ارسال شد.`
              : `فایل با موفقیت آپلود شد و برای ${data?.student_count ?? 0} دانش‌آموز ثبت شد.`,
          );
          resetForm();
        },
        onError: (error) => {
          setUploadProgress(0);
          setFormError(
            getMutationErrorMessage(error, "آپلود محتوای مشترک ناموفق بود."),
          );
        },
      },
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          محتوای مشترک
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          فایل یا لینک را برای همه دانش‌آموزان به‌صورت یک‌جا ثبت کنید
        </p>
      </div>

      <Card>
        <form className="max-w-xl space-y-4" onSubmit={handleSubmit} data-testid="shared-content-form">
          <div>
            <p id="shared-content-type-label" className={adminFieldStyles.label}>
              نوع محتوا
            </p>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
              role="group"
              aria-labelledby="shared-content-type-label"
            >
              {CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = type.value === contentType;
                return (
                  <button
                    key={type.value}
                    type="button"
                    data-testid={`content-type-${type.value}`}
                    onClick={() => {
                      setContentType(type.value);
                      setFile(null);
                      setUrl("");
                    }}
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60",
                    ].join(" ")}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={adminFieldStyles.label} htmlFor="shared-content-title">
              عنوان
            </label>
            <input
              id="shared-content-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid="shared-content-title"
              className={adminFieldStyles.input}
              placeholder="عنوان محتوا"
            />
          </div>

          {isLinkType ? (
            <div>
              <label className={adminFieldStyles.label} htmlFor="shared-content-url">
                آدرس لینک
              </label>
              <input
                id="shared-content-url"
                type="url"
                dir="ltr"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                data-testid="shared-content-url"
                className={adminFieldStyles.input}
                placeholder="https://example.com"
              />
            </div>
          ) : (
            <div>
              <label className={adminFieldStyles.label} htmlFor="shared-content-file">
                فایل
              </label>
              <input
                id="shared-content-file"
                key={contentType}
                type="file"
                accept={selectedType?.accept}
                data-testid="shared-content-file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={adminFieldStyles.input}
              />
              {selectedType?.hint && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedType.hint}
                </p>
              )}
            </div>
          )}

          {!isLinkType && uploadSharedContent.isPending && (
            <UploadProgressBar progress={uploadProgress} />
          )}

          {successMessage && (
            <div
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              role="status"
            >
              <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}

          <Button type="submit" isLoading={uploadSharedContent.isPending} data-testid="shared-content-submit">
            <Upload size={16} aria-hidden="true" />
            {isLinkType ? "ثبت و ارسال به همه" : "آپلود و ارسال به همه"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
