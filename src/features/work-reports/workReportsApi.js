import { supabase } from "../../lib/supabase.js";
import { invokeEdgeFunction } from "../../lib/edgeFunctions.js";
import { uploadFileToStorage } from "../../lib/storageUpload.js";

export const MAX_WORK_REPORT_BYTES = 500 * 1024 * 1024;

const WORK_REPORT_COLUMNS =
  "id, student_id, title, description, report_date, file_path, original_filename, file_size, mime_type, created_at";

const MIME_ALIASES = {
  "image/pjpeg": "image/jpeg",
};

function resolveMimeType(file) {
  const raw = (file.type || "").toLowerCase().trim();
  if (raw) {
    return MIME_ALIASES[raw] ?? raw;
  }
  return "application/pdf";
}

export function getWorkReportDisplayTitle(report) {
  const title = report.title?.trim();
  if (title) {
    return title;
  }
  return report.original_filename;
}

export async function abortWorkReportUpload(objectKey) {
  await invokeEdgeFunction("abort-work-report-upload", { object_key: objectKey });
}

export async function getWorkReports(studentId) {
  const { data, error } = await supabase
    .from("work_reports")
    .select(WORK_REPORT_COLUMNS)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function uploadWorkReport(
  studentId,
  file,
  { title, description, reportDate, onProgress } = {},
) {
  const mimeType = resolveMimeType(file);

  const { objectKey, mimeType: signedMimeType } = await uploadFileToStorage({
    scope: "work-report",
    studentId,
    fileType: "pdf",
    file,
    mimeType,
    onProgress,
  });

  try {
    const trimmedTitle = String(title ?? "").trim();
    const trimmedDescription = String(description ?? "").trim();

    const result = await invokeEdgeFunction("finalize-work-report", {
      object_key: objectKey,
      report_date: reportDate,
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      original_filename: file.name,
      mime_type: signedMimeType,
      file_size: file.size,
    });

    return result.work_report;
  } catch (error) {
    await abortWorkReportUpload(objectKey).catch(() => {});

    const detail =
      error instanceof Error && error.message
        ? error.message
        : "خطا در ثبت نهایی گزارش کار";
    throw new Error(
      `${detail} فایل در فضای ذخیره‌سازی آپلود شده، اما ثبت گزارش انجام نشد.`,
      { cause: error },
    );
  }
}

export async function getWorkReportDownloadUrl(workReportId) {
  const { download_url: downloadUrl } = await invokeEdgeFunction(
    "create-download-url",
    { work_report_id: workReportId },
  );

  return downloadUrl;
}

export async function deleteWorkReport(workReportId) {
  await invokeEdgeFunction("delete-work-report", {
    work_report_id: workReportId,
  });
}
