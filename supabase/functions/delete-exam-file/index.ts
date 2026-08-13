// delete-exam-file: admin-only delete of a public exam analysis file.
//
// Removes the object from the Arvan public bucket, then deletes the DB row.

import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanPublicConfig,
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
    return jsonResponse({ error: "Only admins can delete exam files" }, 403);
  }

  let body: { file_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON" }, 400);
  }

  if (!isUuid(body.file_id)) {
    return jsonResponse({ error: "file_id must be a valid UUID" }, 400);
  }

  const { data: fileRow } = await supabase
    .from("exam_analysis_files")
    .select("id, file_path")
    .eq("id", body.file_id)
    .single();

  if (!fileRow) {
    return jsonResponse({ error: "File not found" }, 404);
  }

  const arvan = getArvanPublicConfig();
  if (!arvan) {
    console.error("delete-exam-file is missing Arvan public storage secrets");
    return jsonResponse({ error: "Public storage is not configured" }, 500);
  }

  try {
    await arvan.s3.send(
      new DeleteObjectCommand({
        Bucket: arvan.publicBucket,
        Key: fileRow.file_path,
      }),
    );
  } catch (error) {
    const storageError = formatStorageError(error);
    console.error(
      "delete-exam-file failed to delete from storage:",
      storageError.name,
      storageError.message,
      storageError.status,
    );
    return jsonResponse(
      { error: "Could not delete the file from storage" },
      502,
    );
  }

  const { error: deleteError } = await supabase
    .from("exam_analysis_files")
    .delete()
    .eq("id", fileRow.id);

  if (deleteError) {
    console.error(
      "delete-exam-file failed to delete the row:",
      deleteError.message,
    );
    return jsonResponse({ error: "Could not update the database" }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
