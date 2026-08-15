// upload-storage-object: admin-only server-side upload to the Arvan private bucket.
//
// Browser PUT to presigned URLs fails on Arvan because OPTIONS preflight on URLs
// with query parameters returns 403 without CORS headers. This function accepts
// the file as the raw request body (not multipart/form-data) with metadata in
// the query string. This avoids ever buffering the whole file in memory: the
// incoming stream is written straight to ephemeral disk storage, then streamed
// from disk to Arvan in bounded-size chunks. Buffering the full file in memory
// (the previous approach) crashes the function with a 546 "WORKER_RESOURCE_LIMIT"
// error once files reach roughly 100 MB+.
//
// Object keys are strictly namespaced per student so files are never mixed:
//   video  -> students/{student_id}/videos/{uuid}.mp4
//   pdf    -> students/{student_id}/pdfs/{uuid}.pdf
//   image  -> students/{student_id}/images/{uuid}.jpg
//   report -> students/{student_id}/reports/{uuid}.pdf

import { Upload } from "npm:@aws-sdk/lib-storage@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanConfig,
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
  image: {
    folder: "images",
    ext: "jpg",
    mimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxBytes: 20 * 1024 * 1024,
  },
  report: {
    folder: "reports",
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
    return jsonResponse({ error: "Only admins can upload files" }, 403);
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("student_id");
  const fileType = url.searchParams.get("file_type");

  if (!isUuid(studentId)) {
    return jsonResponse({ error: "student_id must be a valid UUID" }, 400);
  }

  const typeConfig = fileType ? FILE_TYPES[fileType] : undefined;
  if (!typeConfig) {
    return jsonResponse(
      { error: "file_type must be one of: video, pdf, image, report" },
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

  const { data: student } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .single();
  if (!student || student.role !== "student") {
    return jsonResponse({ error: "student_id does not match a student" }, 404);
  }

  const arvan = getArvanConfig();
  if (!arvan) {
    console.error("upload-storage-object is missing Arvan storage secrets");
    return jsonResponse({ error: "Storage is not configured" }, 500);
  }

  const objectKey =
    `students/${studentId}/${typeConfig.folder}/${crypto.randomUUID()}.${typeConfig.ext}`;

  const tmpPath = `/tmp/${crypto.randomUUID()}.upload`;

  try {
    await Deno.writeFile(tmpPath, request.body);
  } catch (error) {
    console.error(
      "upload-storage-object failed to buffer upload to disk:",
      (error as Error).message,
    );

    return jsonResponse({ error: "Could not receive the uploaded file" }, 500);
  }

  try {
    const tmpFile = await Deno.open(tmpPath, { read: true });
    try {
      const upload = new Upload({
        client: arvan.s3,
        params: {
          Bucket: arvan.privateBucket,
          Key: objectKey,
          Body: tmpFile.readable,
          ContentType: mimeType,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
      });
      await upload.done();
    } finally {
      try {
        tmpFile.close();
      } catch {
        // Already closed by the stream reader — ignore.
      }
    }
  } catch (error) {
    const storageError = formatStorageError(error);
    console.error(
      "upload-storage-object failed to upload:",
      storageError.name,
      storageError.message,
      storageError.status,
    );
    return jsonResponse(
      {
        error: "Could not upload the file to storage",
        detail: storageError.message,
        code: storageError.name,
      },
      502,
    );
  } finally {
    await Deno.remove(tmpPath).catch(() => {});
  }

  return jsonResponse(
    {
      object_key: objectKey,
      mime_type: mimeType,
      file_size: contentLength,
    },
    200,
  );
});
