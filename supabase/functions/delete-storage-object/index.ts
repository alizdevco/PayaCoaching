// delete-storage-object: admin-only delete of a student content item.
//
// Removes the object from the Arvan private bucket (skipped for link rows,
// which have no stored object), then soft-deletes the DB row.

import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanConfig,
  getCaller,
  handlePreflight,
  isUuid,
  jsonResponse,
} from "../_shared/edge.ts";

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) return jsonResponse(request, { error: "Unauthorized" }, 401);
  if (caller.role !== "admin") {
    return jsonResponse(request, { error: "Only admins can delete files" }, 403);
  }

  let body: { content_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  if (!isUuid(body.content_id)) {
    return jsonResponse(request, { error: "content_id must be a valid UUID" }, 400);
  }

  const { data: content } = await supabase
    .from("student_contents")
    .select("id, file_type, file_path, deleted_at")
    .eq("id", body.content_id)
    .single();

  if (!content) {
    return jsonResponse(request, { error: "Content not found" }, 404);
  }
  if (content.deleted_at !== null) {
    return jsonResponse(request, { success: true, already_deleted: true }, 200);
  }

  // Delete the stored object first so we never soft-delete a row while the
  // file silently lives on in the bucket.
  if (content.file_type !== "link") {
    const arvan = getArvanConfig();
    if (!arvan) {
      console.error("delete-storage-object is missing Arvan storage secrets");
      return jsonResponse(request, { error: "Storage is not configured" }, 500);
    }

    try {
      await arvan.s3.send(
        new DeleteObjectCommand({
          Bucket: arvan.privateBucket,
          Key: content.file_path,
        }),
      );
    } catch (error) {
      const storageError = formatStorageError(error);
      console.error(
        "delete-storage-object failed to delete from Arvan:",
        storageError.name,
        storageError.message,
        storageError.status,
      );
      return jsonResponse(request, 
        {
          error:
            "خطا در حذف فایل از فضای ذخیره‌سازی. لطفاً دوباره تلاش کنید.",
        },
        502,
      );
    }
  }

  const { error: updateError } = await supabase
    .from("student_contents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", content.id)
    .is("deleted_at", null);

  if (updateError) {
    console.error(
      "delete-storage-object failed to soft-delete the row:",
      updateError.message,
    );
    return jsonResponse(request, { error: "Could not update the database" }, 500);
  }

  return jsonResponse(request, { success: true }, 200);
});
