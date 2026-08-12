// finalize-shared-upload: after a shared file is uploaded via presigned PUT,
// insert one student_contents row per active student pointing at the object.

import { HeadObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanConfig,
  getCaller,
  handlePreflight,
  jsonResponse,
} from "../_shared/edge.ts";

const FILE_TYPES = new Set(["video", "pdf", "image", "report"]);

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) return jsonResponse({ error: "Unauthorized" }, 401);
  if (caller.role !== "admin") {
    return jsonResponse(
      { error: "Only admins can finalize shared content uploads" },
      403,
    );
  }

  let body: {
    object_key?: unknown;
    file_type?: unknown;
    title?: unknown;
    mime_type?: unknown;
    file_size?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON" }, 400);
  }

  const { object_key, file_type, title, mime_type, file_size } = body;

  if (typeof object_key !== "string" || !object_key.startsWith("shared-content/")) {
    return jsonResponse(
      { error: "object_key must start with shared-content/" },
      400,
    );
  }

  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  if (!trimmedTitle) {
    return jsonResponse({ error: "title is required" }, 400);
  }

  if (typeof file_type !== "string" || !FILE_TYPES.has(file_type)) {
    return jsonResponse(
      { error: "file_type must be one of: video, pdf, image, report" },
      400,
    );
  }

  if (typeof mime_type !== "string" || !mime_type.trim()) {
    return jsonResponse({ error: "mime_type is required" }, 400);
  }

  if (
    typeof file_size !== "number" || !Number.isFinite(file_size) ||
    file_size <= 0
  ) {
    return jsonResponse({ error: "file_size must be a positive number" }, 400);
  }

  const arvan = getArvanConfig();
  if (!arvan) {
    console.error("finalize-shared-upload is missing Arvan storage secrets");
    return jsonResponse({ error: "Storage is not configured" }, 500);
  }

  try {
    await arvan.s3.send(
      new HeadObjectCommand({
        Bucket: arvan.privateBucket,
        Key: object_key,
      }),
    );
  } catch (error) {
    const storageError = formatStorageError(error);
    console.error(
      "finalize-shared-upload object not found:",
      storageError.name,
      storageError.message,
      storageError.status,
    );
    return jsonResponse(
      {
        error: "Uploaded object was not found in storage",
        detail: storageError.message,
      },
      400,
    );
  }

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "student");

  if (studentsError) {
    console.error(
      "finalize-shared-upload failed to load students:",
      studentsError.message,
    );
    return jsonResponse({ error: "Could not load the student list" }, 500);
  }

  const studentIds = (students ?? []).map((student) => student.id as string);

  if (studentIds.length === 0) {
    return jsonResponse({ error: "No students to assign content to" }, 400);
  }

  const rows = studentIds.map((studentId) => ({
    student_id: studentId,
    title: trimmedTitle,
    file_type,
    file_path: object_key,
    mime_type: mime_type.toLowerCase(),
    file_size,
    uploaded_by: caller.id,
  }));

  const { error: insertError, count: insertedCount } = await supabase
    .from("student_contents")
    .insert(rows, { count: "exact" });

  if (insertError) {
    console.error(
      "finalize-shared-upload failed to insert rows:",
      insertError.message,
    );
    return jsonResponse({ error: "Could not save content metadata" }, 500);
  }

  return jsonResponse(
    {
      object_key,
      student_count: insertedCount ?? rows.length,
    },
    200,
  );
});
