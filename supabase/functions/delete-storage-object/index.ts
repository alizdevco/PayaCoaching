// delete-storage-object: admin-only delete of a student content item.
//
// Removes the object from the Arvan private bucket (skipped for link rows,
// which have no stored object), then soft-deletes the DB row.

import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import {
  createServiceClient,
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
  if (!caller) return jsonResponse({ error: "Unauthorized" }, 401);
  if (caller.role !== "admin") {
    return jsonResponse({ error: "Only admins can delete files" }, 403);
  }

  let body: { content_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON" }, 400);
  }

  if (!isUuid(body.content_id)) {
    return jsonResponse({ error: "content_id must be a valid UUID" }, 400);
  }

  const { data: content } = await supabase
    .from("student_contents")
    .select("id, file_type, file_path, deleted_at")
    .eq("id", body.content_id)
    .single();

  if (!content) {
    return jsonResponse({ error: "Content not found" }, 404);
  }
  if (content.deleted_at !== null) {
    return jsonResponse({ success: true, already_deleted: true }, 200);
  }

  // Delete the stored object first so we never soft-delete a row while the
  // file silently lives on in the bucket.
  if (content.file_type !== "link") {
    const arvan = getArvanConfig();
    if (!arvan) {
      console.error("delete-storage-object is missing Arvan storage secrets");
      return jsonResponse({ error: "Storage is not configured" }, 500);
    }

    try {
      await arvan.s3.send(
        new DeleteObjectCommand({
          Bucket: arvan.privateBucket,
          Key: content.file_path,
        }),
      );
    } catch (error) {
      console.error(
        "delete-storage-object failed to delete from Arvan:",
        (error as Error).message,
      );
      return jsonResponse(
        { error: "Could not delete the file from storage" },
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
    return jsonResponse({ error: "Could not update the database" }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
