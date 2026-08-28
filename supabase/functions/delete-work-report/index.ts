// delete-work-report: soft-delete a work report and remove its PDF from storage.
//
// Students may delete only their own active reports; admins may delete any active
// report. The DB row is soft-deleted first so a failed storage delete cannot
// leave an active metadata row pointing at a missing object.

import {
  createServiceClient,
  getCaller,
  handlePreflight,
  isUuid,
  jsonResponse,
} from "../_shared/edge.ts";
import {
  deleteWorkReportObjectBestEffort,
  WorkReportError,
} from "../_shared/workReport.ts";

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) {
    return jsonResponse(request, { error: "Unauthorized" }, 401);
  }

  let body: { work_report_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  if (!isUuid(body.work_report_id)) {
    return jsonResponse(request, { error: "work_report_id must be a valid UUID" }, 400);
  }

  try {
    const { data: report } = await supabase
      .from("work_reports")
      .select("id, student_id, file_path, deleted_at")
      .eq("id", body.work_report_id)
      .single();

    if (!report) {
      return jsonResponse(request, { error: "Work report not found" }, 404);
    }

    if (report.deleted_at !== null) {
      return jsonResponse(request, { success: true, already_deleted: true }, 200);
    }

    if (caller.role !== "admin" && caller.id !== report.student_id) {
      return jsonResponse(request, 
        { error: "You do not have access to this work report" },
        403,
      );
    }

    const { error: updateError } = await supabase
      .from("work_reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", report.id)
      .is("deleted_at", null);

    if (updateError) {
      console.error(
        "delete-work-report failed to soft-delete the row:",
        updateError.message,
      );
      return jsonResponse(request, { error: "Could not update the database" }, 500);
    }

    await deleteWorkReportObjectBestEffort(report.file_path);

    return jsonResponse(request, { success: true }, 200);
  } catch (error) {
    if (error instanceof WorkReportError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }

    console.error("delete-work-report failed:", (error as Error).message);
    return jsonResponse(request, { error: "Could not delete the work report" }, 500);
  }
});
