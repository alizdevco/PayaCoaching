// upload-exam-file: admin-only server-side upload to the Arvan public bucket.
//
// Object keys are namespaced per exam date:
//   video -> exam-analyses/{exam_date}/videos/{uuid}.mp4
//   pdf   -> exam-analyses/{exam_date}/pdfs/{uuid}.pdf
//
// The file is sent as the raw request body (not multipart/form-data) with
// metadata in the query string. The incoming stream is piped directly into
// an S3 multipart upload (bounded-size parts) — it is never buffered in
// memory (which crashes the function with a 546 "WORKER_RESOURCE_LIMIT" once
// files reach roughly 100 MB+) nor written to the Edge Function's ephemeral
// /tmp disk (which has a hard ~256 MB per-invocation quota on this project,
// well below the 1 GB video size limit below — writing a single large file
// there fails with "filesystem quota exceeded" regardless of any cleanup).

import { PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import { Upload } from "npm:@aws-sdk/lib-storage@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanPublicConfig,
  getCaller,
  handlePreflight,
  isUuid,
  jsonResponse,
} from "../_shared/edge.ts";

const FILE_TYPES: Record<
  string,
  { folder: string; ext: string; mimes: string[]; maxBytes: number }
> = {
  video: {
    folder: "videos",
    ext: "mp4",
    mimes: ["video/mp4"],
    maxBytes: 1024 * 1024 * 1024,
  },
  pdf: {
    folder: "pdfs",
    ext: "pdf",
    mimes: ["application/pdf"],
    maxBytes: 50 * 1024 * 1024,
  },
};

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) return jsonResponse({ error: "Unauthorized" }, 401);
  if (caller.role !== "admin") {
    return jsonResponse({ error: "Only admins can upload exam files" }, 403);
  }

  const url = new URL(request.url);
  const examAnalysisId = url.searchParams.get("exam_analysis_id");
  const fileType = url.searchParams.get("file_type");
  const titleParam = url.searchParams.get("title");

  if (!isUuid(examAnalysisId)) {
    return jsonResponse({ error: "exam_analysis_id must be a valid UUID" }, 400);
  }

  const typeConfig = fileType ? FILE_TYPES[fileType] : undefined;
  if (!typeConfig) {
    return jsonResponse(
      { error: "file_type must be one of: video, pdf" },
      400,
    );
  }

  const mimeType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!typeConfig.mimes.includes(mimeType)) {
    return jsonResponse(
      {
        error: `mime_type for ${fileType} must be one of: ${
          typeConfig.mimes.join(", ")
        }`,
      },
      400,
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return jsonResponse({ error: "file_size must be a positive number" }, 400);
  }
  if (contentLength > typeConfig.maxBytes) {
    return jsonResponse(
      {
        error: `File is too large; ${fileType} uploads are limited to ${
          Math.round(typeConfig.maxBytes / (1024 * 1024))
        } MB`,
      },
      400,
    );
  }

  if (!request.body) {
    return jsonResponse({ error: "Request body is required" }, 400);
  }

  const title = titleParam?.trim() || "فایل";

  const { data: examAnalysis } = await supabase
    .from("exam_analyses")
    .select("id, exam_date")
    .eq("id", examAnalysisId)
    .single();

  if (!examAnalysis) {
    return jsonResponse({ error: "Exam analysis not found" }, 404);
  }

  const arvan = getArvanPublicConfig();
  if (!arvan) {
    console.error("upload-exam-file is missing Arvan public storage secrets");
    return jsonResponse({ error: "Public storage is not configured" }, 500);
  }

  const objectKey =
    `exam-analyses/${examAnalysis.exam_date}/${typeConfig.folder}/${crypto.randomUUID()}.${typeConfig.ext}`;
  const publicUrl = arvan.publicUrl(objectKey);

  // Pipe the incoming request body directly into the S3 multipart upload.
  // No intermediate buffering in memory or on ephemeral disk — parts are
  // streamed straight through, so file size is only bounded by the video
  // maxBytes check above, not by the Edge Function's ~256 MB /tmp quota.
  try {
    const upload = new Upload({
      client: arvan.s3,
      params: {
        Bucket: arvan.publicBucket,
        Key: objectKey,
        Body: request.body,
        ContentType: mimeType,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });
    await upload.done();

    // #region agent log
    console.error(JSON.stringify({
      sessionId: "052fb0",
      runId: "post-fix",
      hypothesisId: "fix-verification",
      location: "upload-exam-file/index.ts:direct-stream-upload",
      message: "direct stream-to-S3 upload succeeded, no /tmp write attempted",
      data: { contentLength, objectKey },
      timestamp: Date.now(),
    }));
    // #endregion agent log
  } catch (error) {
    const storageError = formatStorageError(error);
    console.error(
      "upload-exam-file failed to upload:",
      storageError.name,
      storageError.message,
      storageError.status,
    );

    // #region agent log
    console.error(JSON.stringify({
      sessionId: "052fb0",
      runId: "post-fix",
      hypothesisId: "fix-verification",
      location: "upload-exam-file/index.ts:direct-stream-upload",
      message: "direct stream-to-S3 upload failed",
      data: {
        contentLength,
        errorName: storageError.name,
        errorMessage: storageError.message,
      },
      timestamp: Date.now(),
    }));
    // #endregion agent log

    return jsonResponse(
      {
        error: "Could not upload the file to storage",
        detail: storageError.message,
        code: storageError.name,
      },
      502,
    );
  }

  const { data: maxOrderRow } = await supabase
    .from("exam_analysis_files")
    .select("sort_order")
    .eq("exam_analysis_id", examAnalysisId)
    .eq("file_type", fileType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxOrderRow?.sort_order ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("exam_analysis_files")
    .insert({
      exam_analysis_id: examAnalysisId,
      title,
      file_type: fileType,
      file_path: objectKey,
      public_url: publicUrl,
      mime_type: mimeType,
      file_size: contentLength,
      sort_order: sortOrder,
      uploaded_by: caller.id,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error(
      "upload-exam-file failed to insert row:",
      insertError?.message,
    );
    try {
      await arvan.s3.send(
        new DeleteObjectCommand({
          Bucket: arvan.publicBucket,
          Key: objectKey,
        }),
      );
    } catch (cleanupError) {
      console.error(
        "upload-exam-file failed to clean up orphaned object:",
        (cleanupError as Error).message,
      );
    }
    return jsonResponse({ error: "Could not save file metadata" }, 500);
  }

  return jsonResponse(
    {
      object_key: objectKey,
      public_url: publicUrl,
      mime_type: mimeType,
      file_size: contentLength,
      file: inserted,
    },
    200,
  );
});
