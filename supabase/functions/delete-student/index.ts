// delete-student: admin-only hard delete of a student auth identity.
// Deletes auth.users → profiles cascades → related student data cascades.

import {
  createServiceClient,
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
    return jsonResponse(request, { error: "Only admins can delete students" }, 403);
  }

  let body: { student_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  if (!isUuid(body.student_id)) {
    return jsonResponse(request, { error: "student_id must be a valid UUID" }, 400);
  }

  const studentId = body.student_id as string;

  if (studentId === caller.id) {
    return jsonResponse(request, { error: "You cannot delete your own account" }, 400);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .maybeSingle();

  if (!profile || profile.role !== "student") {
    return jsonResponse(request, { error: "Student not found" }, 404);
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(studentId);

  if (deleteError) {
    console.error("delete-student failed:", deleteError.message);
    return jsonResponse(request, { error: "Could not delete the student account" }, 500);
  }

  return jsonResponse(request, { success: true }, 200);
});
