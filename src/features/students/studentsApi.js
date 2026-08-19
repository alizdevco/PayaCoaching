import { invokeEdgeFunction } from "../../lib/edgeFunctions.js";
import { supabase } from "../../lib/supabase.js";

const STUDENT_LIST_COLUMNS =
  "id, phone, first_name, last_name, province, city, consultant_name, grade, academic_major, created_at";

const STUDENT_LIST_CAP = 500;

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

export async function listStudents() {
  const { data, error, count } = await supabase
    .from("profiles")
    .select(STUDENT_LIST_COLUMNS, { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .range(0, STUDENT_LIST_CAP - 1);

  if (error) {
    throw error;
  }

  return {
    students: data ?? [],
    totalCount: count ?? 0,
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
