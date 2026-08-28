// Shared upload validation for the presigned-upload Edge Functions.
//
// create-upload-url (single PUT) and multipart-upload (chunked PUT) must agree
// on scopes, allowed file types, size limits, object key layout and bucket
// selection, so all of that lives here.

import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { S3Client } from "npm:@aws-sdk/client-s3@3.726.0";
import { Caller, getArvanConfig, getArvanPublicConfig, isUuid } from "./edge.ts";

export type UploadScope =
  | "student"
  | "shared"
  | "exam"
  | "online-exam"
  | "work-report";

const SCOPES = new Set<UploadScope>([
  "student",
  "shared",
  "exam",
  "online-exam",
  "work-report",
]);

const FILE_TYPE_CONFIG = {
  video: { folder: "videos", ext: "mp4", mimes: ["video/mp4"] },
  pdf: { folder: "pdfs", ext: "pdf", mimes: ["application/pdf"] },
  image: {
    folder: "images",
    ext: "jpg",
    mimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  report: { folder: "reports", ext: "pdf", mimes: ["application/pdf"] },
} as const;

export type FileType = keyof typeof FILE_TYPE_CONFIG;

const FILE_TYPES_BY_SCOPE: Record<UploadScope, readonly FileType[]> = {
  student: ["video", "pdf", "image", "report"],
  shared: ["video", "pdf", "image", "report"],
  exam: ["video", "pdf"],
  "online-exam": ["pdf"],
  "work-report": ["pdf"],
};

const MAX_BYTES_BY_FILE_TYPE: Record<FileType, number> = {
  video: 1024 * 1024 * 1024, // 1 GiB
  pdf: 500 * 1024 * 1024, // 500 MiB
  image: 20 * 1024 * 1024, // 20 MiB
  report: 500 * 1024 * 1024, // 500 MiB
};

/** Carries the HTTP status the handler should reply with. */
export class UploadRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadRequestError";
    this.status = status;
  }
}

export interface UploadTarget {
  scope: UploadScope;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  folder: string;
  ext: string;
  studentId?: string;
  examDate?: string;
  examId?: string;
}

export interface UploadRequestBody {
  scope?: unknown;
  student_id?: unknown;
  exam_date?: unknown;
  exam_id?: unknown;
  file_type?: unknown;
  mime_type?: unknown;
  file_size?: unknown;
}

function parseScope(value: unknown): UploadScope {
  if (value === undefined || value === null || value === "") {
    return "student";
  }
  if (typeof value === "string" && SCOPES.has(value as UploadScope)) {
    return value as UploadScope;
  }
  throw new UploadRequestError(
    "scope must be one of: student, shared, exam, online-exam, work-report",
    400,
  );
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

async function assertStudentProfile(
  supabase: SupabaseClient,
  studentId: string,
): Promise<void> {
  const { data: student } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .single();

  if (!student || student.role !== "student") {
    throw new UploadRequestError("student_id does not match a student", 404);
  }
}

/**
 * Ensures the authenticated caller may start an upload for the resolved target.
 * Admin-only scopes stay admin-only; students may upload only their own work reports.
 */
export function assertCallerMayUploadScope(
  caller: Caller,
  target: UploadTarget,
): void {
  if (caller.role === "admin") {
    if (target.scope === "work-report") {
      throw new UploadRequestError(
        "Work reports can only be uploaded by students",
        403,
      );
    }
    return;
  }

  if (target.scope !== "work-report") {
    throw new UploadRequestError("Only admins can upload files", 403);
  }

  if (!target.studentId || target.studentId !== caller.id) {
    throw new UploadRequestError(
      "You can only upload work reports for yourself",
      403,
    );
  }
}

/**
 * Validates an upload request and resolves everything needed to build the
 * object key. Throws UploadRequestError with the status to reply with.
 */
export async function resolveUploadTarget(
  body: UploadRequestBody,
  supabase: SupabaseClient,
): Promise<UploadTarget> {
  const scope = parseScope(body.scope);
  const { student_id, exam_date, exam_id, file_type, mime_type, file_size } =
    body;

  const allowedTypes = FILE_TYPES_BY_SCOPE[scope];
  if (
    typeof file_type !== "string" ||
    !allowedTypes.includes(file_type as FileType)
  ) {
    throw new UploadRequestError(
      `file_type must be one of: ${allowedTypes.join(", ")}`,
      400,
    );
  }

  const fileType = file_type as FileType;
  const typeConfig = FILE_TYPE_CONFIG[fileType];
  const maxBytes = MAX_BYTES_BY_FILE_TYPE[fileType];

  if (
    typeof mime_type !== "string" ||
    !(typeConfig.mimes as readonly string[]).includes(mime_type.toLowerCase())
  ) {
    throw new UploadRequestError(
      `mime_type for ${fileType} must be one of: ${typeConfig.mimes.join(", ")}`,
      400,
    );
  }

  if (
    typeof file_size !== "number" || !Number.isFinite(file_size) ||
    file_size <= 0
  ) {
    throw new UploadRequestError("file_size must be a positive number", 400);
  }
  if (file_size > maxBytes) {
    throw new UploadRequestError(
      `File is too large; ${fileType} uploads are limited to ${
        Math.round(maxBytes / (1024 * 1024))
      } MB`,
      400,
    );
  }

  if (scope === "student" || scope === "work-report") {
    if (!isUuid(student_id)) {
      throw new UploadRequestError("student_id must be a valid UUID", 400);
    }

    await assertStudentProfile(supabase, student_id as string);
  } else if (scope === "exam" && !isValidExamDate(exam_date)) {
    throw new UploadRequestError(
      "exam_date must be a valid YYYY-MM-DD date",
      400,
    );
  } else if (scope === "online-exam") {
    if (!isUuid(exam_id)) {
      throw new UploadRequestError("exam_id must be a valid UUID", 400);
    }

    const { data: exam } = await supabase
      .from("online_exams")
      .select("id")
      .eq("id", exam_id)
      .single();
    if (!exam) {
      throw new UploadRequestError(
        "exam_id does not match an online exam",
        404,
      );
    }
  }

  const result = {
    scope,
    fileType,
    mimeType: mime_type,
    fileSize: file_size,
    folder: typeConfig.folder,
    ext: typeConfig.ext,
    studentId: scope === "student" || scope === "work-report"
      ? student_id as string
      : undefined,
    examDate: scope === "exam" ? exam_date as string : undefined,
    examId: scope === "online-exam" ? exam_id as string : undefined,
  };

  return result;
}

export function buildObjectKey(target: UploadTarget): string {
  const fileName = `${crypto.randomUUID()}.${target.ext}`;

  switch (target.scope) {
    case "student":
      return `students/${target.studentId}/${target.folder}/${fileName}`;
    case "shared":
      return `shared-content/${target.folder}/${fileName}`;
    case "exam":
      return `exam-analyses/${target.examDate}/${target.folder}/${fileName}`;
    case "online-exam":
      return `online-exams/${target.examId}/${target.folder}/${fileName}`;
    case "work-report":
      return `work-reports/${target.studentId}/reports/${fileName}`;
  }
}

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FOLDER_PATTERN = "(?:videos|pdfs|images|reports)";
const FILE_NAME_PATTERN = `${UUID_PATTERN}\\.(?:mp4|pdf|jpg)`;

const OBJECT_KEY_PATTERNS: Record<UploadScope, RegExp> = {
  student: new RegExp(
    `^students/${UUID_PATTERN}/${FOLDER_PATTERN}/${FILE_NAME_PATTERN}$`,
    "i",
  ),
  shared: new RegExp(
    `^shared-content/${FOLDER_PATTERN}/${FILE_NAME_PATTERN}$`,
    "i",
  ),
  exam: new RegExp(
    `^exam-analyses/\\d{4}-\\d{2}-\\d{2}/${FOLDER_PATTERN}/${FILE_NAME_PATTERN}$`,
    "i",
  ),
  "online-exam": new RegExp(
    `^online-exams/${UUID_PATTERN}/pdfs/${UUID_PATTERN}\\.pdf$`,
    "i",
  ),
  "work-report": new RegExp(
    `^work-reports/(${UUID_PATTERN})/reports/${UUID_PATTERN}\\.pdf$`,
    "i",
  ),
};

/** Returns the student_id embedded in a work-report object key, if valid. */
export function parseWorkReportStudentIdFromObjectKey(
  objectKey: string,
): string | null {
  const match = OBJECT_KEY_PATTERNS["work-report"].exec(objectKey);
  if (!match?.[1]) {
    return null;
  }
  return match[1].toLowerCase();
}

/**
 * Later multipart calls send back an object key the client received earlier.
 * Only keys this service could have generated may be signed again, so a caller
 * cannot aim part uploads at an arbitrary object.
 */
export function parseObjectKeyForScope(
  scope: unknown,
  objectKey: unknown,
): { scope: UploadScope; objectKey: string } {
  const parsedScope = parseScope(scope);

  if (
    typeof objectKey !== "string" ||
    !OBJECT_KEY_PATTERNS[parsedScope].test(objectKey)
  ) {
    throw new UploadRequestError(
      "object_key is not a valid key for this scope",
      400,
    );
  }

  return { scope: parsedScope, objectKey };
}

export interface StorageTarget {
  s3: S3Client;
  bucket: string;
  publicUrl: ((objectKey: string) => string) | null;
}

/** Exam media lives in the public bucket; everything else in the private one. */
export function getStorageTarget(scope: UploadScope): StorageTarget {
  if (scope === "exam") {
    const publicArvan = getArvanPublicConfig();
    if (!publicArvan) {
      console.error("Missing Arvan public storage secrets");
      throw new UploadRequestError("Public storage is not configured", 500);
    }
    return {
      s3: publicArvan.s3,
      bucket: publicArvan.publicBucket,
      publicUrl: publicArvan.publicUrl,
    };
  }

  const privateArvan = getArvanConfig();
  if (!privateArvan) {
    console.error("Missing Arvan storage secrets");
    throw new UploadRequestError("Storage is not configured", 500);
  }
  return {
    s3: privateArvan.s3,
    bucket: privateArvan.privateBucket,
    publicUrl: null,
  };
}
