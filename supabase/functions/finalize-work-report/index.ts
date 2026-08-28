// finalize-work-report: after a student uploads a PDF via presigned PUT,
// verify the object exists and insert a work_reports metadata row.
//
// On DB insert failure the uploaded object is deleted to avoid orphans.

import { HeadObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanConfig,
  getCaller,
  handlePreflight,
  jsonResponse,
} from "../_shared/edge.ts";
import { parseWorkReportStudentIdFromObjectKey } from "../_shared/uploadTarget.ts";
import {
  assertWorkReportObjectKeyForStudent,
  cleanupOrphanWorkReportObjects,
  deleteWorkReportObjectBestEffort,
  isValidReportDate,
  WorkReportError,
} from "../_shared/workReport.ts";

const WORK_REPORT_MIME = "application/pdf";
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

async function cleanupUploadedObject(objectKey: string): Promise<void> {
  await deleteWorkReportObjectBestEffort(objectKey);
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) {
    return jsonResponse(request, { error: "Unauthorized" }, 401);
  }
  if (caller.role !== "student") {
    return jsonResponse(request, 
      { error: "Only students can finalize work report uploads" },
      403,
    );
  }

  let body: {
    object_key?: unknown;
    report_date?: unknown;
    title?: unknown;
    description?: unknown;
    original_filename?: unknown;
    mime_type?: unknown;
    file_size?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  try {
    const objectKey = typeof body.object_key === "string" ? body.object_key : "";
    if (!objectKey || !parseWorkReportStudentIdFromObjectKey(objectKey)) {
      return jsonResponse(request, 
        { error: "object_key must be a valid work-report storage key" },
        400,
      );
    }

    assertWorkReportObjectKeyForStudent(objectKey, caller.id);

    await cleanupOrphanWorkReportObjects(supabase, caller.id);

    if (!isValidReportDate(body.report_date)) {
      return jsonResponse(request, 
        { error: "report_date must be a valid YYYY-MM-DD date" },
        400,
      );
    }

    const originalFilename = typeof body.original_filename === "string"
      ? body.original_filename.trim()
      : "";
    if (!originalFilename) {
      return jsonResponse(request, { error: "original_filename is required" }, 400);
    }

    const mimeType = typeof body.mime_type === "string"
      ? body.mime_type.toLowerCase().trim()
      : "";
    if (mimeType !== WORK_REPORT_MIME) {
      return jsonResponse(request, 
        { error: "mime_type must be application/pdf" },
        400,
      );
    }

    if (
      typeof body.file_size !== "number" || !Number.isFinite(body.file_size) ||
      body.file_size <= 0
    ) {
      return jsonResponse(request, { error: "file_size must be a positive number" }, 400);
    }
    if (body.file_size > MAX_FILE_SIZE_BYTES) {
      return jsonResponse(request, { error: "File is too large" }, 400);
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string"
      ? body.description.trim()
      : "";

    const arvan = getArvanConfig();
    if (!arvan) {
      console.error("finalize-work-report is missing Arvan storage secrets");
      return jsonResponse(request, { error: "Storage is not configured" }, 500);
    }

    let headResult;
    try {
      headResult = await arvan.s3.send(
        new HeadObjectCommand({
          Bucket: arvan.privateBucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      const storageError = formatStorageError(error);
      console.error(
        "finalize-work-report object not found:",
        storageError.name,
        storageError.message,
        storageError.status,
      );
      return jsonResponse(request, 
        {
          error: "خطا در تأیید فایل در فضای ذخیره‌سازی. لطفاً دوباره تلاش کنید.",
        },
        400,
      );
    }

    if (
      typeof headResult.ContentLength === "number" &&
      headResult.ContentLength !== body.file_size
    ) {
      await cleanupUploadedObject(objectKey);
      return jsonResponse(request, 
        { error: "Uploaded file size does not match the declared file_size" },
        400,
      );
    }

    const storedContentType = (headResult.ContentType ?? "").toLowerCase();
    if (
      storedContentType &&
      storedContentType !== WORK_REPORT_MIME &&
      storedContentType !== "application/x-pdf" &&
      storedContentType !== "binary/octet-stream"
    ) {
      await cleanupUploadedObject(objectKey);
      return jsonResponse(request, 
        { error: "Uploaded file is not a PDF" },
        400,
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("work_reports")
      .insert({
        student_id: caller.id,
        title: title || null,
        description: description || null,
        report_date: body.report_date,
        file_path: objectKey,
        original_filename: originalFilename,
        mime_type: WORK_REPORT_MIME,
        file_size: body.file_size,
      })
      .select("id, student_id, title, description, report_date, file_path, original_filename, file_size, mime_type, created_at")
      .single();

    if (insertError || !inserted) {
      console.error(
        "finalize-work-report failed to insert row:",
        insertError?.message ?? "no row returned",
      );
      await cleanupUploadedObject(objectKey);
      return jsonResponse(request, 
        { error: "Could not save work report metadata" },
        500,
      );
    }

    return jsonResponse(request, { work_report: inserted }, 200);
  } catch (error) {
    if (error instanceof WorkReportError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }

    console.error("finalize-work-report failed:", (error as Error).message);
    return jsonResponse(request, { error: "Could not finalize the work report" }, 500);
  }
});
