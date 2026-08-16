// create-upload-url: admin-only presigned PUT URL for Arvan storage.
//
// Supports four upload scopes:
//   student     -> private bucket, students/{student_id}/{folder}/{uuid}.{ext}
//   shared      -> private bucket, shared-content/{folder}/{uuid}.{ext}
//   exam        -> public bucket,  exam-analyses/{exam_date}/{folder}/{uuid}.{ext}
//   online-exam -> private bucket, online-exams/{exam_id}/pdfs/{uuid}.pdf
//
// Defaults to scope "student" for backward compatibility with existing callers.
//
// This is the single-request path, used for small files. Larger files go
// through the multipart-upload function so a dropped connection only costs one
// part instead of the whole transfer.

import { PutObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getCaller,
  handlePreflight,
  jsonResponse,
} from "../_shared/edge.ts";
import {
  buildObjectKey,
  getStorageTarget,
  resolveUploadTarget,
  UploadRequestError,
} from "../_shared/uploadTarget.ts";

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) {
    return jsonResponse(request, { error: "Unauthorized" }, 401);
  }
  if (caller.role !== "admin") {
    return jsonResponse(request, { error: "Only admins can upload files" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  try {
    const target = await resolveUploadTarget(body, supabase);

    const storage = getStorageTarget(target.scope);
    const objectKey = buildObjectKey(target);

    let uploadUrl: string;
    try {
      uploadUrl = await getSignedUrl(
        storage.s3,
        new PutObjectCommand({
          Bucket: storage.bucket,
          Key: objectKey,
          ContentType: target.mimeType,
        }),
        {
          expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
          signableHeaders: new Set(["content-type"]),
        },
      );
    } catch (error) {
      const storageError = formatStorageError(error);
      console.error(
        "create-upload-url failed to presign:",
        storageError.name,
        storageError.message,
        storageError.status,
      );
      return jsonResponse(request, 
        { error: "خطا در ایجاد آدرس آپلود. لطفاً دوباره تلاش کنید." },
        502,
      );
    }

    return jsonResponse(request, 
      {
        upload_url: uploadUrl,
        object_key: objectKey,
        mime_type: target.mimeType,
        ...(storage.publicUrl
          ? { public_url: storage.publicUrl(objectKey) }
          : {}),
      },
      200,
    );
  } catch (error) {
    if (error instanceof UploadRequestError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }
    console.error("create-upload-url failed:", (error as Error).message);
    return jsonResponse(request, { error: "Could not create the upload URL" }, 500);
  }
});
