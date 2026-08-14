import { supabase } from "../../lib/supabase.js";
import { invokeEdgeFunction } from "../../lib/edgeFunctions.js";
import { uploadFileToStorage } from "../../lib/storageUpload.js";

const EXAM_COLUMNS =
  "id, exam_date, title, content, description, is_published, published_at, created_by, updated_by, created_at, updated_at";

const EXAM_FILE_COLUMNS =
  "id, exam_analysis_id, title, file_type, file_path, public_url, mime_type, file_size, sort_order, uploaded_by, created_at";

const UPLOAD_STALL_TIMEOUT_MS = 60_000;

const EXAM_LIST_SELECT = `
  id,
  exam_date,
  title,
  description,
  is_published,
  published_at,
  created_at,
  updated_at,
  exam_analysis_files ( file_type )
`;

const EXAM_DETAIL_SELECT = `
  ${EXAM_COLUMNS},
  exam_analysis_files ( ${EXAM_FILE_COLUMNS} )
`;

function resolveMimeType(file, fileType) {
  const raw = (file.type || "").toLowerCase().trim();
  if (raw) {
    return raw;
  }

  const defaults = {
    pdf: "application/pdf",
    video: "video/mp4",
  };

  return defaults[fileType] ?? "application/octet-stream";
}

async function getNextSortOrder(examAnalysisId, fileType) {
  const { data: maxOrderRow, error } = await supabase
    .from("exam_analysis_files")
    .select("sort_order")
    .eq("exam_analysis_id", examAnalysisId)
    .eq("file_type", fileType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (maxOrderRow?.sort_order ?? -1) + 1;
}

function uploadWithProgress(url, headers, body, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stallTimer = null;

    function clearStallTimer() {
      if (stallTimer !== null) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    }

    function settle(fn) {
      if (settled) {
        return;
      }
      settled = true;
      clearStallTimer();
      fn();
    }

    function rejectUpload(message) {
      settle(() => reject(new Error(message)));
    }

    // Inactivity watchdog (resets on progress) instead of xhr.timeout, which is
    // a total request budget that would abort long-but-healthy uploads.
    function armStallTimeout() {
      clearStallTimer();
      stallTimer = setTimeout(() => {
        rejectUpload("آپلود به‌دلیل قطع ارتباط متوقف شد.");
        xhr.abort();
      }, UPLOAD_STALL_TIMEOUT_MS);
    }

    xhr.open("POST", url);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      armStallTimeout();
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (data?.error) {
          settle(() =>
            reject(
              new Error(
                typeof data.error === "string" ? data.error : data.error.message,
              ),
            ),
          );
          return;
        }
        settle(() => resolve(data));
        return;
      }

      settle(() =>
        reject(
          new Error(
            data.detail ??
              (typeof data.error === "string"
                ? data.error
                : data.error?.message ?? `خطا در آپلود فایل (${xhr.status})`),
          ),
        ),
      );
    };

    xhr.onerror = () => {
      rejectUpload("خطا در آپلود فایل");
    };

    xhr.onabort = () => {
      rejectUpload("آپلود لغو شد.");
    };

    armStallTimeout();
    xhr.send(body);
  });
}

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

function countFilesByType(files, fileType) {
  return (files ?? []).filter((file) => file.file_type === fileType).length;
}

function mapExamListRow(row) {
  const { exam_analysis_files: files, ...exam } = row;

  return {
    ...exam,
    videoCount: countFilesByType(files, "video"),
    pdfCount: countFilesByType(files, "pdf"),
  };
}

function buildPublishFields(isPublished) {
  if (isPublished) {
    return {
      is_published: true,
      published_at: new Date().toISOString(),
    };
  }

  return {
    is_published: false,
    published_at: null,
  };
}

function buildExamWritePayload(
  { examDate, title, content, description, isPublished },
  userId,
  { isCreate },
) {
  const payload = {
    exam_date: examDate,
    title: String(title ?? "").trim(),
    content: String(content ?? "").trim(),
    description: String(description ?? "").trim() || null,
  };

  if (!payload.title) {
    throw new Error("عنوان آزمون الزامی است.");
  }
  if (!payload.content) {
    throw new Error("متن تحلیل الزامی است.");
  }
  if (!payload.exam_date) {
    throw new Error("تاریخ آزمون الزامی است.");
  }

  if (typeof isPublished === "boolean") {
    Object.assign(payload, buildPublishFields(isPublished));
  }

  if (isCreate) {
    payload.created_by = userId;
  } else {
    payload.updated_by = userId;
  }

  return payload;
}

export async function listExams({ publishedOnly = false, page, pageSize } = {}) {
  const isPaginated = Number.isFinite(page) && Number.isFinite(pageSize);

  let query = supabase
    .from("exam_analyses")
    .select(EXAM_LIST_SELECT, isPaginated ? { count: "exact" } : undefined)
    .order("exam_date", { ascending: false });

  if (publishedOnly) {
    query = query.eq("is_published", true);
  }

  if (isPaginated) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const items = (data ?? []).map(mapExamListRow);

  if (isPaginated) {
    return {
      items,
      totalCount: count ?? 0,
    };
  }

  return items;
}

export async function getExamAnalysis(examDate) {
  const { data, error } = await supabase
    .from("exam_analyses")
    .select(EXAM_DETAIL_SELECT)
    .eq("exam_date", examDate)
    .order("file_type", {
      referencedTable: "exam_analysis_files",
      ascending: true,
    })
    .order("sort_order", {
      referencedTable: "exam_analysis_files",
      ascending: true,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { exam_analysis_files: files, ...exam } = data;

  return {
    ...exam,
    files: files ?? [],
    videoCount: countFilesByType(files, "video"),
    pdfCount: countFilesByType(files, "pdf"),
  };
}

export async function createExam({
  examDate,
  title,
  content,
  description,
  isPublished = false,
}) {
  const userId = await getCurrentUserId();
  const payload = buildExamWritePayload(
    { examDate, title, content, description, isPublished },
    userId,
    { isCreate: true },
  );

  const { data, error } = await supabase
    .from("exam_analyses")
    .insert(payload)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateExam(
  examId,
  { examDate, title, content, description, isPublished },
) {
  const userId = await getCurrentUserId();
  const payload = buildExamWritePayload(
    { examDate, title, content, description, isPublished },
    userId,
    { isCreate: false },
  );

  const { data, error } = await supabase
    .from("exam_analyses")
    .update(payload)
    .eq("id", examId)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function publishExam(examId) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("exam_analyses")
    .update({
      ...buildPublishFields(true),
      updated_by: userId,
    })
    .eq("id", examId)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function unpublishExam(examId) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("exam_analyses")
    .update({
      ...buildPublishFields(false),
      updated_by: userId,
    })
    .eq("id", examId)
    .select(EXAM_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteExam(examId) {
  const { error } = await supabase
    .from("exam_analyses")
    .delete()
    .eq("id", examId);

  if (error) {
    throw error;
  }
}

export async function uploadExamFile(
  examAnalysisId,
  fileType,
  file,
  { title, onProgress } = {},
) {
  const { data: examAnalysis, error: examError } = await supabase
    .from("exam_analyses")
    .select("id, exam_date")
    .eq("id", examAnalysisId)
    .single();

  if (examError || !examAnalysis) {
    throw new Error("تحلیل آزمون یافت نشد.");
  }

  const mimeType = resolveMimeType(file, fileType);
  const trimmedTitle = String(title ?? "").trim() || "فایل";

  const {
    objectKey,
    mimeType: signedMimeType,
    publicUrl,
  } = await uploadFileToStorage({
    scope: "exam",
    examDate: examAnalysis.exam_date,
    fileType,
    file,
    mimeType,
    onProgress,
  });

  if (!publicUrl) {
    throw new Error("آدرس عمومی فایل دریافت نشد.");
  }

  const uploadedBy = await getCurrentUserId();
  const sortOrder = await getNextSortOrder(examAnalysisId, fileType);

  const { data: inserted, error: insertError } = await supabase
    .from("exam_analysis_files")
    .insert({
      exam_analysis_id: examAnalysisId,
      title: trimmedTitle,
      file_type: fileType,
      file_path: objectKey,
      public_url: publicUrl,
      mime_type: signedMimeType,
      file_size: file.size,
      sort_order: sortOrder,
      uploaded_by: uploadedBy,
    })
    .select(EXAM_FILE_COLUMNS)
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `${insertError?.message ?? "خطا در ثبت اطلاعات فایل"} فایل در فضای ذخیره‌سازی آپلود شده، اما ثبت نهایی انجام نشد.`,
    );
  }

  return inserted;
}

/** Legacy server-side upload via Edge Function (fallback only). */
export async function uploadExamFileLegacy(
  examAnalysisId,
  fileType,
  file,
  { title, onProgress } = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("برای این عملیات باید وارد شوید.");
  }

  const params = new URLSearchParams({
    exam_analysis_id: examAnalysisId,
    file_type: fileType,
  });
  const trimmedTitle = String(title ?? "").trim();
  if (trimmedTitle) {
    params.set("title", trimmedTitle);
  }

  const url =
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-exam-file?${params.toString()}`;
  const data = await uploadWithProgress(
    url,
    {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": file.type,
    },
    file,
    onProgress,
  );

  return data.file;
}

export async function deleteExamFile(fileId) {
  await invokeEdgeFunction("delete-exam-file", { file_id: fileId });
}
