// create-upload-url: admin-only presigned PUT URL for Arvan storage.
//
// Supports three upload scopes:
//   student -> private bucket, students/{student_id}/{folder}/{uuid}.{ext}
//   shared  -> private bucket, shared-content/{folder}/{uuid}.{ext}
//   exam    -> public bucket,  exam-analyses/{exam_date}/{folder}/{uuid}.{ext}
//
// Defaults to scope "student" for backward compatibility with existing callers.

import { PutObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.726.0";
import {
  createServiceClient,
  getArvanConfig,
  getArvanPublicConfig,
  getCaller,
  handlePreflight,
  isUuid,
  jsonResponse,
} from "../_shared/edge.ts";

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

type UploadScope = "student" | "shared" | "exam";

const SCOPES = new Set<UploadScope>(["student", "shared", "exam"]);

const FILE_TYPE_CONFIG = {
  video: {
    folder: "videos",
    ext: "mp4",
    mimes: ["video/mp4"],
  },
  pdf: {
    folder: "pdfs",
    ext: "pdf",
    mimes: ["application/pdf"],
  },
  image: {
    folder: "images",
    ext: "jpg",
    mimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  report: {
    folder: "reports",
    ext: "pdf",
    mimes: ["application/pdf"],
  },
} as const;

type FileType = keyof typeof FILE_TYPE_CONFIG;

const FILE_TYPES_BY_SCOPE: Record<
  UploadScope,
  readonly FileType[]
> = {
  student: ["video", "pdf", "image", "report"],
  shared: ["video", "pdf", "image", "report"],
  exam: ["video", "pdf"],
};

const MAX_BYTES_BY_FILE_TYPE: Record<FileType, number> = {
  video: 1024 * 1024 * 1024, // 1 GiB
  pdf: 500 * 1024 * 1024, // 500 MiB
  image: 20 * 1024 * 1024, // 20 MiB
  report: 500 * 1024 * 1024, // 500 MiB
};

function parseScope(value: unknown): UploadScope {
  if (value === undefined || value === null || value === "") {
    return "student";
  }
  if (typeof value === "string" && SCOPES.has(value as UploadScope)) {
    return value as UploadScope;
  }
  throw new Error("scope must be one of: student, shared, exam");
}

function isValidExamDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function getTypeConfig(scope: UploadScope, fileType: unknown) {
  if (typeof fileType !== "string") {
    return null;
  }

  const allowedTypes = FILE_TYPES_BY_SCOPE[scope];
  if (!allowedTypes.includes(fileType as FileType)) {
    return null;
  }

  const typedFileType = fileType as FileType;
  const baseConfig = FILE_TYPE_CONFIG[typedFileType];

  return { ...baseConfig, maxBytes: MAX_BYTES_BY_FILE_TYPE[typedFileType] };
}

function buildObjectKey(
  scope: UploadScope,
  typeConfig: { folder: string; ext: string },
  params: { studentId?: string; examDate?: string },
): string {
  const fileName = `${crypto.randomUUID()}.${typeConfig.ext}`;

  switch (scope) {
    case "student":
      return `students/${params.studentId}/${typeConfig.folder}/${fileName}`;
    case "shared":
      return `shared-content/${typeConfig.folder}/${fileName}`;
    case "exam":
      return `exam-analyses/${params.examDate}/${typeConfig.folder}/${fileName}`;
  }
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) return jsonResponse({ error: "Unauthorized" }, 401);
  if (caller.role !== "admin") {
    return jsonResponse({ error: "Only admins can upload files" }, 403);
  }

  let body: {
    scope?: unknown;
    student_id?: unknown;
    exam_date?: unknown;
    file_type?: unknown;
    mime_type?: unknown;
    file_size?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON" }, 400);
  }

  let scope: UploadScope;
  try {
    scope = parseScope(body.scope);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400);
  }

  const { student_id, exam_date, file_type, mime_type, file_size } = body;

  const typeConfig = getTypeConfig(scope, file_type);
  if (!typeConfig) {
    const allowed = FILE_TYPES_BY_SCOPE[scope].join(", ");
    return jsonResponse(
      { error: `file_type must be one of: ${allowed}` },
      400,
    );
  }

  if (
    typeof mime_type !== "string" ||
    !typeConfig.mimes.includes(mime_type.toLowerCase())
  ) {
    return jsonResponse(
      {
        error: `mime_type for ${file_type} must be one of: ${
          typeConfig.mimes.join(", ")
        }`,
      },
      400,
    );
  }

  if (
    typeof file_size !== "number" || !Number.isFinite(file_size) ||
    file_size <= 0
  ) {
    return jsonResponse({ error: "file_size must be a positive number" }, 400);
  }
  if (file_size > typeConfig.maxBytes) {
    return jsonResponse(
      {
        error: `File is too large; ${file_type} uploads are limited to ${
          Math.round(typeConfig.maxBytes / (1024 * 1024))
        } MB`,
      },
      400,
    );
  }

  if (scope === "student") {
    if (!isUuid(student_id)) {
      return jsonResponse({ error: "student_id must be a valid UUID" }, 400);
    }

    const { data: student } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", student_id)
      .single();
    if (!student || student.role !== "student") {
      return jsonResponse({ error: "student_id does not match a student" }, 404);
    }
  } else if (scope === "exam") {
    if (!isValidExamDate(exam_date)) {
      return jsonResponse(
        { error: "exam_date must be a valid YYYY-MM-DD date" },
        400,
      );
    }
  }

  const privateArvan = scope === "exam" ? null : getArvanConfig();
  const publicArvan = scope === "exam" ? getArvanPublicConfig() : null;

  if (scope === "exam") {
    if (!publicArvan) {
      console.error("create-upload-url is missing Arvan public storage secrets");
      return jsonResponse({ error: "Public storage is not configured" }, 500);
    }
  } else if (!privateArvan) {
    console.error("create-upload-url is missing Arvan storage secrets");
    return jsonResponse({ error: "Storage is not configured" }, 500);
  }

  const objectKey = buildObjectKey(scope, typeConfig, {
    studentId: scope === "student" ? student_id as string : undefined,
    examDate: scope === "exam" ? exam_date as string : undefined,
  });

  const bucket = scope === "exam"
    ? publicArvan!.publicBucket
    : privateArvan!.privateBucket;
  const s3 = scope === "exam" ? publicArvan!.s3 : privateArvan!.s3;

  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: mime_type,
      }),
      {
        expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
        signableHeaders: new Set(["content-type"]),
      },
    );
  } catch (error) {
    console.error(
      "create-upload-url failed to presign:",
      (error as Error).message,
    );
    return jsonResponse({ error: "Could not create the upload URL" }, 502);
  }

  return jsonResponse(
    { upload_url: uploadUrl, object_key: objectKey, mime_type },
    200,
  );
});
