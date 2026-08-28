// Shared helpers for student work report Edge Functions.

import { DeleteObjectCommand, ListObjectsV2Command } from "npm:@aws-sdk/client-s3@3.726.0";
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { formatStorageError, getArvanConfig } from "./edge.ts";
import { parseWorkReportStudentIdFromObjectKey } from "./uploadTarget.ts";

/** Unfinalized uploads older than this may be cleaned up automatically. */
export const ORPHAN_WORK_REPORT_MAX_AGE_MS = 60 * 60 * 1000;

export function isValidReportDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function assertWorkReportObjectKeyForStudent(
  objectKey: string,
  studentId: string,
): void {
  const ownerId = parseWorkReportStudentIdFromObjectKey(objectKey);
  if (!ownerId || ownerId !== studentId.toLowerCase()) {
    throw new WorkReportError(
      "object_key does not belong to this student",
      403,
    );
  }
}

export class WorkReportError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkReportError";
    this.status = status;
  }
}

export async function deleteWorkReportObject(objectKey: string): Promise<void> {
  const arvan = getArvanConfig();
  if (!arvan) {
    throw new WorkReportError("Storage is not configured", 500);
  }

  try {
    await arvan.s3.send(
      new DeleteObjectCommand({
        Bucket: arvan.privateBucket,
        Key: objectKey,
      }),
    );
  } catch (error) {
    const storageError = formatStorageError(error);
    console.error(
      "work report storage delete failed:",
      storageError.name,
      storageError.message,
      storageError.status,
    );
    throw new WorkReportError(
      "خطا در حذف فایل از فضای ذخیره‌سازی. لطفاً دوباره تلاش کنید.",
      502,
    );
  }
}

/** Best-effort storage delete; logs failures without failing the caller. */
export async function deleteWorkReportObjectBestEffort(
  objectKey: string,
): Promise<void> {
  try {
    await deleteWorkReportObject(objectKey);
  } catch (error) {
    console.error(
      "work report best-effort storage delete failed:",
      (error as Error).message,
    );
  }
}

async function listRegisteredWorkReportPaths(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("work_reports")
    .select("file_path")
    .eq("student_id", studentId);

  if (error) {
    console.error(
      "work report registered path lookup failed:",
      error.message,
    );
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.file_path as string));
}

/**
 * Removes stale unfinalized objects under the student's work-report prefix.
 * Objects newer than ORPHAN_WORK_REPORT_MAX_AGE_MS are kept for in-flight uploads.
 */
export async function cleanupOrphanWorkReportObjects(
  supabase: SupabaseClient,
  studentId: string,
): Promise<void> {
  const arvan = getArvanConfig();
  if (!arvan) {
    console.error("orphan work report cleanup skipped: storage not configured");
    return;
  }

  const prefix = `work-reports/${studentId}/reports/`;
  const registeredPaths = await listRegisteredWorkReportPaths(supabase, studentId);
  const cutoffMs = Date.now() - ORPHAN_WORK_REPORT_MAX_AGE_MS;

  let continuationToken: string | undefined;

  do {
    let listed;
    try {
      listed = await arvan.s3.send(
        new ListObjectsV2Command({
          Bucket: arvan.privateBucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
    } catch (error) {
      const storageError = formatStorageError(error);
      console.error(
        "orphan work report list failed:",
        storageError.name,
        storageError.message,
        storageError.status,
      );
      return;
    }

    for (const object of listed.Contents ?? []) {
      const objectKey = object.Key;
      if (!objectKey || registeredPaths.has(objectKey)) {
        continue;
      }

      const lastModifiedMs = object.LastModified?.getTime() ?? 0;
      if (lastModifiedMs > cutoffMs) {
        continue;
      }

      await deleteWorkReportObjectBestEffort(objectKey);
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

/** Deletes an uploaded object that was never registered in work_reports. */
export async function abortUnfinalizedWorkReportUpload(
  supabase: SupabaseClient,
  objectKey: string,
  studentId: string,
): Promise<void> {
  assertWorkReportObjectKeyForStudent(objectKey, studentId);

  const { data: existingReport } = await supabase
    .from("work_reports")
    .select("id")
    .eq("file_path", objectKey)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingReport) {
    throw new WorkReportError(
      "This upload is already registered as a work report",
      409,
    );
  }

  await deleteWorkReportObject(objectKey);
}
