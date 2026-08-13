import { supabase } from "../../lib/supabase.js";

export async function fetchDashboardStats() {
  const [studentsResult, reportsResult, examsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("student_contents")
      .select("*", { count: "exact", head: true })
      .eq("file_type", "report"),
    supabase
      .from("exam_analyses")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),
  ]);

  if (studentsResult.error) {
    throw studentsResult.error;
  }
  if (reportsResult.error) {
    throw reportsResult.error;
  }
  if (examsResult.error) {
    throw examsResult.error;
  }

  return {
    studentCount: studentsResult.count ?? 0,
    reportCount: reportsResult.count ?? 0,
    publishedExamCount: examsResult.count ?? 0,
  };
}
