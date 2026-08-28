// abort-work-report-upload: delete an unfinalized work-report object from storage.
//
// Students may abort only their own uploads that were never registered in
// work_reports. Used when finalize fails or the client needs to discard a upload.

import {
  createServiceClient,
  getCaller,
  handlePreflight,
  jsonResponse,
} from "../_shared/edge.ts";
import { parseWorkReportStudentIdFromObjectKey } from "../_shared/uploadTarget.ts";
import {
  abortUnfinalizedWorkReportUpload,
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
  if (caller.role !== "student") {
    return jsonResponse(request, 
      { error: "Only students can abort work report uploads" },
      403,
    );
  }

  let body: { object_key?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  const objectKey = typeof body.object_key === "string" ? body.object_key : "";
  if (!objectKey || !parseWorkReportStudentIdFromObjectKey(objectKey)) {
    return jsonResponse(request, 
      { error: "object_key must be a valid work-report storage key" },
      400,
    );
  }

  try {
    await abortUnfinalizedWorkReportUpload(supabase, objectKey, caller.id);
    return jsonResponse(request, { success: true }, 200);
  } catch (error) {
    if (error instanceof WorkReportError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }

    console.error("abort-work-report-upload failed:", (error as Error).message);
    return jsonResponse(request, { error: "Could not abort the work report upload" }, 500);
  }
});
