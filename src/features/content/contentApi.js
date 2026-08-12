import { supabase } from "../../lib/supabase.js";

const CONTENT_COLUMNS =
  "id, student_id, title, description, file_type, file_path, mime_type, file_size, report_date, uploaded_by, created_at, updated_at";

const UPLOAD_STALL_TIMEOUT_MS = 60_000;

const MIME_ALIASES = {
  "image/pjpeg": "image/jpeg",
};

async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    throw error;
  }
  if (data?.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error.message,
    );
  }

  return data;
}

function resolveMimeType(file, fileType) {
  const raw = (file.type || "").toLowerCase().trim();
  if (raw) {
    return MIME_ALIASES[raw] ?? raw;
  }

  const defaults = {
    pdf: "application/pdf",
    report: "application/pdf",
    video: "video/mp4",
    image: "image/jpeg",
  };

  return defaults[fileType] ?? "application/octet-stream";
}

/**
 * Uploads a file body via XMLHttpRequest so upload.onprogress fires.
 * Standard fetch() has no upload progress API in browsers.
 */
function putFileWithProgress(uploadUrl, contentType, file, onProgress) {
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

    // Inactivity watchdog: abort only if no upload progress is observed for
    // UPLOAD_STALL_TIMEOUT_MS. Unlike xhr.timeout (a *total* request budget),
    // this resets on every progress event so long-but-healthy uploads finish.
    function armStallTimeout() {
      clearStallTimer();
      stallTimer = setTimeout(() => {
        rejectUpload("آپلود به‌دلیل قطع ارتباط متوقف شد.");
        xhr.abort();
      }, UPLOAD_STALL_TIMEOUT_MS);
    }

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      armStallTimeout();
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        settle(() => resolve());
        return;
      }

      rejectUpload(`خطا در آپلود فایل به فضای ذخیره‌سازی (${xhr.status})`);
    };

    xhr.onerror = () => {
      rejectUpload("خطا در آپلود فایل به فضای ذخیره‌سازی");
    };

    xhr.onabort = () => {
      rejectUpload("آپلود لغو شد.");
    };

    armStallTimeout();
    xhr.send(file);
  });
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

async function requestPresignedUploadUrl(studentId, fileType, mimeType, fileSize) {
  try {
    return await invokeFunction("create-upload-url", {
      student_id: studentId,
      file_type: fileType,
      mime_type: mimeType,
      file_size: fileSize,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "خطا در دریافت آدرس آپلود";
    const presignError = new Error(message);
    presignError.cause = error;
    throw presignError;
  }
}

export async function getStudentContents(studentId) {
  const { data, error } = await supabase
    .from("student_contents")
    .select(CONTENT_COLUMNS)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function uploadFile(
  studentId,
  fileType,
  file,
  { title, reportDate, onProgress } = {},
) {
  const mimeType = resolveMimeType(file, fileType);

  const presign = await requestPresignedUploadUrl(
    studentId,
    fileType,
    mimeType,
    file.size,
  );
  const uploadUrl = presign.upload_url;
  const objectKey = presign.object_key;
  const signedMimeType = presign.mime_type ?? mimeType;

  try {
    await putFileWithProgress(uploadUrl, signedMimeType, file, onProgress);
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("خطا در آپلود فایل به فضای ذخیره‌سازی");
  }

  const uploadedBy = await getCurrentUserId();
  const trimmedTitle = String(title ?? "").trim();

  const { data, error } = await supabase
    .from("student_contents")
    .insert({
      student_id: studentId,
      title: trimmedTitle || file.name,
      file_type: fileType,
      file_path: objectKey,
      mime_type: signedMimeType,
      file_size: file.size,
      report_date: reportDate ?? null,
      uploaded_by: uploadedBy,
    })
    .select(CONTENT_COLUMNS)
    .single();

  if (error) {
    const dbError = new Error(error.message || "خطا در ثبت اطلاعات فایل");
    dbError.cause = error;
    throw dbError;
  }

  return data;
}

export async function uploadSharedContent(
  fileType,
  file,
  { title, onProgress } = {},
) {
  const trimmedTitle = String(title ?? "").trim();
  if (!trimmedTitle) {
    throw new Error("عنوان الزامی است.");
  }

  const mimeType = resolveMimeType(file, fileType);

  let presign;
  try {
    presign = await invokeFunction("create-upload-url", {
      scope: "shared",
      file_type: fileType,
      mime_type: mimeType,
      file_size: file.size,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "خطا در دریافت آدرس آپلود";
    const presignError = new Error(message);
    presignError.cause = error;
    throw presignError;
  }

  const uploadUrl = presign.upload_url;
  const objectKey = presign.object_key;
  const signedMimeType = presign.mime_type ?? mimeType;

  try {
    await putFileWithProgress(uploadUrl, signedMimeType, file, onProgress);
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("خطا در آپلود فایل به فضای ذخیره‌سازی");
  }

  try {
    return await invokeFunction("finalize-shared-upload", {
      object_key: objectKey,
      file_type: fileType,
      title: trimmedTitle,
      mime_type: signedMimeType,
      file_size: file.size,
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? error.message
        : "خطا در ثبت نهایی فایل";
    throw new Error(
      `${detail} فایل در فضای ذخیره‌سازی آپلود شده، اما ثبت برای دانش‌آموزان انجام نشد.`,
    );
  }
}

/** Legacy server-side upload via Edge Function (fallback only). */
export async function uploadSharedContentLegacy(
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

  const trimmedTitle = String(title ?? "").trim();
  if (!trimmedTitle) {
    throw new Error("عنوان الزامی است.");
  }

  const params = new URLSearchParams({
    file_type: fileType,
    title: trimmedTitle,
  });

  const url =
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-shared-content?${params.toString()}`;
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

  return data;
}

export async function addLink(studentId, title, url) {
  const uploadedBy = await getCurrentUserId();

  const { data, error } = await supabase
    .from("student_contents")
    .insert({
      student_id: studentId,
      title,
      file_type: "link",
      file_path: url,
      mime_type: null,
      file_size: null,
      uploaded_by: uploadedBy,
    })
    .select(CONTENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDownloadUrl(contentId) {
  const { download_url: downloadUrl } = await invokeFunction(
    "create-download-url",
    { content_id: contentId },
  );

  return downloadUrl;
}

export async function deleteContent(contentId) {
  await invokeFunction("delete-storage-object", { content_id: contentId });
}
