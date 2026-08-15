import { invokeEdgeFunction } from "../../lib/edgeFunctions.js";
import { supabase } from "../../lib/supabase.js";

const STUDENT_LIST_COLUMNS =
  "id, phone, first_name, last_name, province, city, consultant_name, grade, academic_major, created_at";

function escapeIlikePattern(value) {
  return String(value ?? "").replace(/[%_\\]/g, "\\$&");
}

function buildStudentUpdatePayload(data) {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    province: data.province,
    city: data.city,
    consultant_name: data.consultantName,
    grade: data.grade,
    academic_major: data.academicMajor,
  };
}

export async function listStudents({ search, page, pageSize = 10 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select(STUDENT_LIST_COLUMNS, { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const trimmedSearch = String(search ?? "").trim();
  if (trimmedSearch) {
    const pattern = `%${escapeIlikePattern(trimmedSearch)}%`;
    query = query.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},consultant_name.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return {
    students: data ?? [],
    totalCount: count ?? 0,
    page: safePage,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function getStudentById(studentId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .eq("role", "student")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateStudentProfile(studentId, data) {
  const updatePayload = buildStudentUpdatePayload(data);

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", studentId)
    .eq("role", "student")
    .select()
    .single();

  if (error) {
    throw error;
  }

  return updated;
}

export async function deleteStudent(studentId) {
  await invokeEdgeFunction("delete-student", { student_id: studentId });
}
