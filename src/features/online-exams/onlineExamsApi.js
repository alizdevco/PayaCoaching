import { supabase } from "../../lib/supabase.js";
import { invokeEdgeFunction } from "../../lib/edgeFunctions.js";
import { uploadFileToStorage } from "../../lib/storageUpload.js";
import { buildLocalDateTimeIso } from "../../lib/persianDate.js";

const EXAM_COLUMNS =
  "id, title, start_at, duration_minutes, question_count, pdf_file_path, answer_key, created_by, created_at, updated_at";

const MAX_QUESTION_COUNT = 150;

const ATTEMPT_COLUMNS =
  "id, exam_id, student_id, started_at, status, answers, raw_score, percentage, finalized_at, created_at, updated_at";

const ATTEMPT_LIST_SELECT = `
  ${ATTEMPT_COLUMNS},
  profiles:student_id ( id, first_name, last_name, phone )
`;

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("برای این عملیات باید وارد شوید.");
  }

  return user.id;
}

function normalizeQuestionCount(questionCount) {
  const count = Number(questionCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTION_COUNT) {
    throw new Error(`تعداد سوالات باید عددی بین ۱ تا ${MAX_QUESTION_COUNT} باشد.`);
  }
  return count;
}

function normalizeAnswerKey(answerKey, questionCount) {
  if (!answerKey || typeof answerKey !== "object") {
    throw new Error("کلید پاسخ الزامی است.");
  }

  const count = normalizeQuestionCount(questionCount);
  const normalized = {};

  for (let question = 1; question <= count; question += 1) {
    const key = String(question);
    const value = Number(answerKey[key]);

    if (!Number.isInteger(value) || value < 1 || value > 4) {
      throw new Error(`پاسخ سوال ${question} باید عددی بین ۱ تا ۴ باشد.`);
    }

    normalized[key] = value;
  }

  return normalized;
}

function resolveStartAt(startAt) {
  if (startAt instanceof Date) {
    return startAt.toISOString();
  }
  if (typeof startAt === "string" && startAt) {
    return startAt;
  }
  if (startAt?.date && startAt?.time) {
    return buildLocalDateTimeIso(startAt.date, startAt.time);
  }
  return null;
}

function buildExamCreatePayload(
  { title, startAt, durationMinutes, questionCount, answerKey },
  userId,
) {
  const normalizedQuestionCount = normalizeQuestionCount(questionCount);
  const payload = {
    title: String(title ?? "").trim(),
    duration_minutes: Number(durationMinutes),
    question_count: normalizedQuestionCount,
    answer_key: normalizeAnswerKey(answerKey, normalizedQuestionCount),
    created_by: userId,
  };

  if (!payload.title) {
    throw new Error("عنوان آزمون الزامی است.");
  }

  if (!Number.isFinite(payload.duration_minutes) || payload.duration_minutes <= 0) {
    throw new Error("مدت آزمون باید بیشتر از صفر باشد.");
  }

  const resolvedStartAt = resolveStartAt(startAt);
  if (!resolvedStartAt) {
    throw new Error("زمان شروع آزمون الزامی است.");
  }

  payload.start_at = resolvedStartAt;
  return payload;
}

function buildExamUpdatePayload({
  title,
  startAt,
  durationMinutes,
  questionCount,
  answerKey,
  pdfFilePath,
}) {
  const payload = {};

  if (title !== undefined) {
    payload.title = String(title ?? "").trim();
    if (!payload.title) {
      throw new Error("عنوان آزمون الزامی است.");
    }
  }

  if (durationMinutes !== undefined) {
    payload.duration_minutes = Number(durationMinutes);
    if (!Number.isFinite(payload.duration_minutes) || payload.duration_minutes <= 0) {
      throw new Error("مدت آزمون باید بیشتر از صفر باشد.");
    }
  }

  if (startAt !== undefined) {
    const resolvedStartAt = resolveStartAt(startAt);
    if (!resolvedStartAt) {
      throw new Error("زمان شروع آزمون الزامی است.");
    }
    payload.start_at = resolvedStartAt;
  }

  if (questionCount !== undefined) {
    payload.question_count = normalizeQuestionCount(questionCount);
  }

  if (answerKey !== undefined) {
    const count =
      questionCount !== undefined
        ? normalizeQuestionCount(questionCount)
        : undefined;
    if (count === undefined) {
      throw new Error("همراه با کلید پاسخ، تعداد سوالات نیز الزامی است.");
    }
    payload.answer_key = normalizeAnswerKey(answerKey, count);
  }

  if (pdfFilePath !== undefined) {
    payload.pdf_file_path = pdfFilePath;
  }

  return payload;
}

function mapRpcExamRow(row) {
  if (!row) {
    return null;
  }
  return row;
}

function mapAttemptListRow(row) {
  const { profiles: student, ...attempt } = row;
  return {
    ...attempt,
    student: student ?? null,
  };
}

export async function listOnlineExams() {
  const { data, error } = await supabase
    .from("online_exams")
    .select(EXAM_COLUMNS)
    .order("start_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getOnlineExam(examId) {
  const { data, error } = await supabase
    .from("online_exams")
    .select(EXAM_COLUMNS)
    .eq("id", examId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listMyOnlineExamAttempts() {
  const { data, error } = await supabase
    .from("online_exam_attempts")
    .select(ATTEMPT_COLUMNS);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listStudentOnlineExams() {
  const { data, error } = await supabase.rpc("list_student_online_exams");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getStudentOnlineExam(examId) {
  const { data, error } = await supabase.rpc("get_student_online_exam", {
    p_exam_id: examId,
  });

  if (error) {
    throw error;
  }

  return mapRpcExamRow(data?.[0] ?? null);
}

export async function createOnlineExam({
  title,
  startAt,
  durationMinutes,
  questionCount,
  answerKey,
}) {
  const userId = await getCurrentUserId();
  const payload = buildExamCreatePayload(
    { title, startAt, durationMinutes, questionCount, answerKey },
    userId,
  );

  const { data, error } = await supabase
    .from("online_exams")
    .insert(payload)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOnlineExam(
  examId,
  { title, startAt, durationMinutes, questionCount, answerKey, pdfFilePath },
) {
  const payload = buildExamUpdatePayload({
    title,
    startAt,
    durationMinutes,
    questionCount,
    answerKey,
    pdfFilePath,
  });

  if (Object.keys(payload).length === 0) {
    throw new Error("هیچ فیلدی برای به‌روزرسانی ارسال نشده است.");
  }

  const { data, error } = await supabase
    .from("online_exams")
    .update(payload)
    .eq("id", examId)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteOnlineExam(examId) {
  const { error } = await supabase.from("online_exams").delete().eq("id", examId);

  if (error) {
    throw error;
  }
}

export async function uploadOnlineExamPdf(examId, file, { onProgress } = {}) {
  const { data: exam, error: examError } = await supabase
    .from("online_exams")
    .select("id")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    throw new Error("آزمون آنلاین یافت نشد.");
  }

  const mimeType = (file.type || "application/pdf").toLowerCase();
  if (!mimeType.includes("pdf")) {
    throw new Error("فقط فایل PDF مجاز است.");
  }

  const { objectKey } = await uploadFileToStorage({
    scope: "online-exam",
    fileType: "pdf",
    file,
    mimeType,
    examId,
    onProgress,
  });

  const { data, error } = await supabase
    .from("online_exams")
    .update({ pdf_file_path: objectKey })
    .eq("id", examId)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw new Error(
      `${error.message ?? "خطا در ثبت مسیر فایل"} فایل در فضای ذخیره‌سازی آپلود شده، اما ثبت نهایی انجام نشد.`,
    );
  }

  return data;
}

export async function getOnlineExamDownloadUrl(examId) {
  const { download_url: downloadUrl } = await invokeEdgeFunction(
    "create-download-url",
    { online_exam_id: examId },
  );

  if (!downloadUrl) {
    throw new Error("آدرس دانلود دریافت نشد.");
  }

  return downloadUrl;
}

export async function getMyOnlineExamAttempt(examId) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("online_exam_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("exam_id", examId)
    .eq("student_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function setAttemptStartedAt(attemptId) {
  const { data, error } = await supabase
    .from("online_exam_attempts")
    .update({ started_at: new Date().toISOString() })
    .eq("id", attemptId)
    .is("started_at", null)
    .select(ATTEMPT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: existing, error: fetchError } = await supabase
    .from("online_exam_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", attemptId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  return existing;
}

export async function ensureAttemptStarted(examId) {
  const userId = await getCurrentUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("online_exam_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("exam_id", examId)
    .eq("student_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    if (existing.started_at) {
      return existing;
    }
    return setAttemptStartedAt(existing.id);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("online_exam_attempts")
    .insert({
      exam_id: examId,
      student_id: userId,
    })
    .select(ATTEMPT_COLUMNS)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("online_exam_attempts")
        .select(ATTEMPT_COLUMNS)
        .eq("exam_id", examId)
        .eq("student_id", userId)
        .single();

      if (raceError) {
        throw raceError;
      }

      if (raced.started_at) {
        return raced;
      }

      return setAttemptStartedAt(raced.id);
    }

    throw insertError;
  }

  return setAttemptStartedAt(inserted.id);
}

export async function startOnlineExamDownload(examId) {
  const attempt = await ensureAttemptStarted(examId);
  const downloadUrl = await getOnlineExamDownloadUrl(examId);

  return { attempt, downloadUrl };
}

export async function updateAttemptAnswers(attemptId, answers) {
  const { data, error } = await supabase
    .from("online_exam_attempts")
    .update({ answers })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select(ATTEMPT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("ذخیره پاسخ‌ها ممکن نیست؛ آزمون ممکن است پایان یافته باشد.");
  }

  return data;
}

export async function finalizeOnlineExamAttempt(attemptId, force = false) {
  const { data, error } = await supabase.rpc("finalize_online_exam_attempt", {
    p_attempt_id: attemptId,
    p_force: force,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function finalizeDueOnlineExamAttempts(examId) {
  const { data, error } = await supabase.rpc(
    "finalize_due_online_exam_attempts",
    { p_exam_id: examId },
  );

  if (error) {
    throw error;
  }

  return data ?? 0;
}

export async function listOnlineExamAttempts(examId) {
  const { data, error } = await supabase
    .from("online_exam_attempts")
    .select(ATTEMPT_LIST_SELECT)
    .eq("exam_id", examId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAttemptListRow);
}

export async function getOnlineExamAttemptWithLazyFinalize(examId) {
  const attempt = await getMyOnlineExamAttempt(examId);

  if (!attempt || attempt.status !== "in_progress") {
    return attempt;
  }

  return finalizeOnlineExamAttempt(attempt.id, false);
}

export async function listOnlineExamAttemptsWithLazyFinalize(examId) {
  await finalizeDueOnlineExamAttempts(examId);
  return listOnlineExamAttempts(examId);
}
