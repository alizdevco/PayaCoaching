import { supabase } from "../../lib/supabase.js";
import { buildLocalDateTimeIso } from "../../lib/persianDate.js";

const CONSULTATION_COLUMNS =
  "id, student_id, consultant_name, scheduled_at, notes, created_at, updated_at";

export async function getConsultations(studentId) {
  const { data, error } = await supabase
    .from("consultations")
    .select(CONSULTATION_COLUMNS)
    .eq("student_id", studentId)
    .order("scheduled_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addConsultation(
  studentId,
  { consultantName, date, time },
) {
  const trimmedName = String(consultantName ?? "").trim();
  if (!trimmedName) {
    throw new Error("نام مشاور الزامی است.");
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      student_id: studentId,
      consultant_name: trimmedName,
      scheduled_at: buildLocalDateTimeIso(date, time),
    })
    .select(CONSULTATION_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteConsultation(consultationId) {
  const { error } = await supabase
    .from("consultations")
    .delete()
    .eq("id", consultationId);

  if (error) {
    throw error;
  }
}
