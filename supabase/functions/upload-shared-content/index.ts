// upload-shared-content: admin-only server-side upload of a single file that
// gets assigned to every student at once (e.g. a class-wide video or PDF).
//
// Follows the exact same streaming pattern as upload-storage-object: the file
// is sent as the raw request body (not multipart/form-data) with metadata in
// the query string. The incoming stream is written straight to ephemeral disk
// storage, then streamed from disk to Arvan in bounded-size chunks, so the
// whole file is never buffered in memory.
//
// Object keys are namespaced under a shared-content prefix (not per student):
//   video  -> shared-content/videos/{uuid}.mp4
//   pdf    -> shared-content/pdfs/{uuid}.pdf
//   image  -> shared-content/images/{uuid}.jpg
//   report -> shared-content/reports/{uuid}.pdf
//
// After the upload succeeds, one student_contents row is inserted per active
// student (role = 'student') pointing at the same file_path, so every student
// sees the content without duplicating the underlying object.

import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import { Upload } from "npm:@aws-sdk/lib-storage@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanConfig,
  getCaller,
  handlePreflight,
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
    return jsonResponse(
      { error: "Only admins can upload shared content" },
      403,
    );
  }

  const url = new URL(request.url);
  const fileType = url.searchParams.get("file_type");
  const titleParam = url.searchParams.get("title");

  const typeConfig = fileType ? FILE_TYPES[fileType] : undefined;
  if (!typeConfig) {
    return jsonResponse(
      { error: "file_type must be one of: video, pdf, image, report" },
      400,
    );
  }

  const title = titleParam?.trim() ?? "";
  if (!title) {
    return jsonResponse({ error: "title is required" }, 400);
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

  const arvan = getArvanConfig();
  if (!arvan) {
    console.error("upload-shared-content is missing Arvan storage secrets");
    return jsonResponse({ error: "Storage is not configured" }, 500);
  }

  const objectKey =
    `shared-content/${typeConfig.folder}/${crypto.randomUUID()}.${typeConfig.ext}`;

  const tmpPath = `/tmp/${crypto.randomUUID()}.upload`;
  try {
    await Deno.writeFile(tmpPath, request.body);
  } catch (error) {
    console.error(
      "upload-shared-content failed to buffer upload to disk:",
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
      "upload-shared-content failed to upload:",
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

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "student");

  if (studentsError) {
    console.error(
      "upload-shared-content failed to load students:",
      studentsError.message,
    );
    await arvan.s3.send(
      new DeleteObjectCommand({ Bucket: arvan.privateBucket, Key: objectKey }),
    ).catch((cleanupError) => {
      console.error(
        "upload-shared-content failed to clean up orphaned object:",
        (cleanupError as Error).message,
      );
    });
    return jsonResponse({ error: "Could not load the student list" }, 500);
  }

  const studentIds = (students ?? []).map((student) => student.id as string);

  if (studentIds.length === 0) {
    await arvan.s3.send(
      new DeleteObjectCommand({ Bucket: arvan.privateBucket, Key: objectKey }),
    ).catch((cleanupError) => {
      console.error(
        "upload-shared-content failed to clean up orphaned object:",
        (cleanupError as Error).message,
      );
    });
    return jsonResponse({ error: "No students to assign content to" }, 400);
  }

  const rows = studentIds.map((studentId) => ({
    student_id: studentId,
    title,
    file_type: fileType,
    file_path: objectKey,
    mime_type: mimeType,
    file_size: contentLength,
    uploaded_by: caller.id,
  }));

  const { error: insertError, count: insertedCount } = await supabase
    .from("student_contents")
    .insert(rows, { count: "exact" });

  if (insertError) {
    console.error(
      "upload-shared-content failed to insert rows:",
      insertError.message,
    );
    await arvan.s3.send(
      new DeleteObjectCommand({ Bucket: arvan.privateBucket, Key: objectKey }),
    ).catch((cleanupError) => {
      console.error(
        "upload-shared-content failed to clean up orphaned object:",
        (cleanupError as Error).message,
      );
    });
    return jsonResponse({ error: "Could not save content metadata" }, 500);
  }

  return jsonResponse(
    {
      object_key: objectKey,
      mime_type: mimeType,
      file_size: contentLength,
      student_count: insertedCount ?? rows.length,
    },
    200,
  );
});
