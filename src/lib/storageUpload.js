// Browser-side uploads to Arvan storage, shared by every admin upload path.
//
// Small files go up in one PUT. Larger files are split into parts, because a
// single PUT is all-or-nothing: on an unstable link the transfer can die at 40%
// and every byte already sent is lost. With multipart only the failing part is
// retried, and each attempt gets a freshly signed URL so expiry never bites.

import { invokeEdgeFunction } from "./edgeFunctions.js";

const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;
const PART_CONCURRENCY = 2;
const MAX_ATTEMPTS_PER_PART = 4;
const RETRY_BASE_DELAY_MS = 1_000;

// Abort a request only after this long with no bytes moving. Unlike
// xhr.timeout, which is a total budget, this resets on every progress event so
// a slow-but-healthy upload is never cut off. 8 MiB parts on slow links can
// take several minutes between progress bursts.
const STALL_TIMEOUT_MS = 3 * 60 * 1000;

const STALL_MESSAGE = "آپلود به‌دلیل قطع ارتباط متوقف شد.";
const RETRIES_EXHAUSTED_MESSAGE =
  "آپلود پس از چند بار تلاش کامل نشد. لطفاً اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.";

class UploadError extends Error {
  constructor(message, { retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "UploadError";
    this.retryable = retryable;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Sends one request body with progress reporting. fetch() has no upload
 * progress API in browsers, so this stays on XMLHttpRequest.
 */
function putWithProgress(url, body, { contentType, onLoaded, register }) {
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
      register?.(xhr, false);
      fn();
    }

    function fail(message, retryable) {
      settle(() => reject(new UploadError(message, { retryable })));
    }

    function armStallTimeout() {
      clearStallTimer();
      stallTimer = setTimeout(() => {
        fail(STALL_MESSAGE, true);
        xhr.abort();
      }, STALL_TIMEOUT_MS);
    }

    xhr.open("PUT", url);
    if (contentType) {
      xhr.setRequestHeader("Content-Type", contentType);
    }

    xhr.upload.onprogress = (event) => {
      armStallTimeout();
      onLoaded?.(event.loaded);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        settle(() => resolve({ etag: xhr.getResponseHeader("ETag") }));
        return;
      }

      fail(
        `خطا در آپلود فایل به فضای ذخیره‌سازی (${xhr.status})`,
        isRetryableStatus(xhr.status),
      );
    };

    xhr.onerror = () => {
      fail("خطا در ارتباط با فضای ذخیره‌سازی", true);
    };

    xhr.onabort = () => {
      fail("آپلود لغو شد.", false);
    };

    register?.(xhr, true);
    armStallTimeout();
    xhr.send(body);
  });
}

/** Retries an operation on any failure, keeping the original error message. */
async function withRetries(operation) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PART; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === MAX_ATTEMPTS_PER_PART) {
        throw error;
      }
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
}

/**
 * Retries the transfer itself, asking for a fresh URL each time so a retry
 * never reuses a URL that expired while an earlier attempt was stalling.
 */
async function putWithRetry({ getUrl, body, contentType, onLoaded, register }) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PART; attempt += 1) {
    try {
      onLoaded?.(0);
      return await putWithProgress(await getUrl(), body, {
        contentType,
        onLoaded,
        register,
      });
    } catch (error) {
      lastError = error;
      onLoaded?.(0);

      if (!(error instanceof UploadError) || !error.retryable) {
        throw error;
      }
      if (attempt === MAX_ATTEMPTS_PER_PART) {
        break;
      }

      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new UploadError(RETRIES_EXHAUSTED_MESSAGE, { cause: lastError });
}

function buildScopeBody({ scope, fileType, mimeType, studentId, examDate, examId }) {
  return {
    scope,
    file_type: fileType,
    mime_type: mimeType,
    ...(scope === "student" ? { student_id: studentId } : {}),
    ...(scope === "exam" ? { exam_date: examDate } : {}),
    ...(scope === "online-exam" ? { exam_id: examId } : {}),
  };
}

async function uploadInOnePut({ scopeBody, file, mimeType, onProgress }) {
  const presign = await invokeEdgeFunction("create-upload-url", {
    ...scopeBody,
    file_size: file.size,
  });

  const signedMimeType = presign.mime_type ?? mimeType;
  // The presigned URL is bound to one object key, so a retry has to reuse it
  // rather than presign again and orphan the first key.
  const uploadUrl = presign.upload_url;

  await putWithRetry({
    getUrl: () => uploadUrl,
    body: file,
    contentType: signedMimeType,
    onLoaded: (loaded) => reportProgress(onProgress, loaded, file.size),
  });

  return {
    objectKey: presign.object_key,
    mimeType: signedMimeType,
    publicUrl: presign.public_url ?? null,
  };
}

function reportProgress(onProgress, loaded, total) {
  if (!onProgress || !total) {
    return;
  }
  // Hold back the last percent until the object actually exists in storage.
  onProgress(Math.min(99, Math.round((loaded / total) * 100)));
}

function splitIntoParts(file, partSize) {
  const parts = [];
  for (let offset = 0; offset < file.size; offset += partSize) {
    parts.push({
      partNumber: parts.length + 1,
      blob: file.slice(offset, Math.min(offset + partSize, file.size)),
    });
  }
  return parts;
}

async function runWithConcurrency(items, limit, worker) {
  let cursor = 0;
  let failure = null;

  async function runNext() {
    while (cursor < items.length && !failure) {
      const item = items[cursor];
      cursor += 1;
      try {
        await worker(item);
      } catch (error) {
        // Keep the first failure: later ones are usually the siblings being
        // cancelled in response to it.
        failure ??= error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runNext),
  );

  if (failure) {
    throw failure;
  }
}

async function uploadInParts({ scopeBody, file, mimeType, onProgress }) {
  const created = await invokeEdgeFunction("multipart-upload", {
    ...scopeBody,
    action: "create",
    file_size: file.size,
  });

  const { upload_id: uploadId, object_key: objectKey } = created;
  const signedMimeType = created.mime_type ?? mimeType;

  if (!uploadId || !objectKey || !created.part_size) {
    throw new UploadError("پاسخ ناقص از سرور برای شروع آپلود دریافت شد.");
  }

  const parts = splitIntoParts(file, created.part_size);

  const loadedByPart = new Array(parts.length).fill(0);
  const inFlight = new Set();
  const etags = new Array(parts.length).fill(null);

  function register(xhr, isActive) {
    if (isActive) {
      inFlight.add(xhr);
    } else {
      inFlight.delete(xhr);
    }
  }

  function cancelInFlight() {
    for (const xhr of inFlight) {
      xhr.abort();
    }
  }

  // A flaky link can also drop the signing call, so it gets its own retries;
  // failing here would otherwise throw away the parts already uploaded.
  function signPart(partNumber) {
    return withRetries(async () => {
      const { parts: signed } = await invokeEdgeFunction("multipart-upload", {
        scope: scopeBody.scope,
        action: "sign",
        object_key: objectKey,
        upload_id: uploadId,
        part_numbers: [partNumber],
      });

      const url = signed?.[0]?.url;
      if (!url) {
        throw new UploadError("آدرس آپلود بخش فایل دریافت نشد.");
      }
      return url;
    });
  }

  function reportPartProgress(index, loaded) {
    loadedByPart[index] = loaded;
    const total = loadedByPart.reduce((sum, value) => sum + value, 0);
    reportProgress(onProgress, total, file.size);
  }

  try {
    await runWithConcurrency(parts, PART_CONCURRENCY, async (part) => {
      const index = part.partNumber - 1;

      try {
        const { etag } = await putWithRetry({
          getUrl: () => signPart(part.partNumber),
          body: part.blob,
          register,
          onLoaded: (loaded) => reportPartProgress(index, loaded),
        });

        if (!etag) {
          throw new UploadError(
            "فضای ذخیره‌سازی شناسه بخش آپلودشده را برنگرداند.",
          );
        }

        etags[index] = etag;
        // The last progress event is not guaranteed to report the full size.
        reportPartProgress(index, part.blob.size);
      } catch (error) {
        // Stop the sibling parts now instead of letting them run their own
        // retries for an upload that is already lost.
        cancelInFlight();
        throw error;
      }
    });
  } catch (error) {
    // Unfinished parts keep occupying storage until they are discarded.
    await invokeEdgeFunction("multipart-upload", {
      scope: scopeBody.scope,
      action: "abort",
      object_key: objectKey,
      upload_id: uploadId,
    }).catch(() => {});

    throw error;
  }

  const completed = await invokeEdgeFunction("multipart-upload", {
    scope: scopeBody.scope,
    action: "complete",
    object_key: objectKey,
    upload_id: uploadId,
    parts: etags.map((etag, index) => ({
      part_number: index + 1,
      etag,
    })),
  });

  return {
    objectKey,
    mimeType: signedMimeType,
    publicUrl: completed.public_url ?? created.public_url ?? null,
  };
}

/**
 * Uploads a file to Arvan storage and returns where it landed. Callers are
 * responsible for recording the metadata afterwards.
 */
export async function uploadFileToStorage({
  scope,
  fileType,
  file,
  mimeType,
  studentId,
  examDate,
  examId,
  onProgress,
}) {
  const scopeBody = buildScopeBody({
    scope,
    fileType,
    mimeType,
    studentId,
    examDate,
    examId,
  });

  const useMultipart = file.size > MULTIPART_THRESHOLD_BYTES;
  const upload = useMultipart ? uploadInParts : uploadInOnePut;

  const result = await upload({ scopeBody, file, mimeType, onProgress });
  onProgress?.(100);
  return result;
}
