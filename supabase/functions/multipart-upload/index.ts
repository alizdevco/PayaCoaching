// multipart-upload: admin-only S3 multipart upload lifecycle for Arvan storage.
//
// A single PUT of a large file is all-or-nothing: one dropped connection throws
// away everything already transferred. Multipart splits the file so the browser
// can retry just the part that failed.
//
// Actions:
//   create   -> starts the upload, returns upload_id, object_key and part_size
//   sign     -> presigned PUT URLs for the given part numbers
//   complete -> assembles the parts into the final object
//   abort    -> discards an unfinished upload so no orphaned parts are stored
//
// Only "sign" is exposed to the browser as a direct-to-storage URL; create,
// complete and abort run here with the service credentials.

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "npm:@aws-sdk/client-s3@3.726.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getCaller,
  handlePreflight,
  jsonResponse,
} from "../_shared/edge.ts";
import {
  buildObjectKey,
  getStorageTarget,
  parseObjectKeyForScope,
  resolveUploadTarget,
  UploadRequestError,
} from "../_shared/uploadTarget.ts";

const PART_URL_EXPIRY_SECONDS = 15 * 60;

// S3 requires every part except the last to be at least 5 MiB. Bigger parts
// mean fewer round trips; smaller parts mean less to re-send after a drop.
const PART_SIZE_BYTES = 8 * 1024 * 1024;

const MAX_PARTS = 10_000;
const MAX_PART_URLS_PER_REQUEST = 10;

type Action = "create" | "sign" | "complete" | "abort";

const ACTIONS = new Set<Action>(["create", "sign", "complete", "abort"]);

function parseAction(value: unknown): Action {
  if (typeof value === "string" && ACTIONS.has(value as Action)) {
    return value as Action;
  }
  throw new UploadRequestError(
    "action must be one of: create, sign, complete, abort",
    400,
  );
}

function parseUploadId(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 512) {
    throw new UploadRequestError("upload_id is required", 400);
  }
  return value;
}

function parsePartNumbers(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new UploadRequestError("part_numbers must be a non-empty array", 400);
  }
  if (value.length > MAX_PART_URLS_PER_REQUEST) {
    throw new UploadRequestError(
      `part_numbers accepts at most ${MAX_PART_URLS_PER_REQUEST} entries`,
      400,
    );
  }

  return value.map((entry) => {
    if (
      typeof entry !== "number" || !Number.isInteger(entry) || entry < 1 ||
      entry > MAX_PARTS
    ) {
      throw new UploadRequestError(
        `part numbers must be integers between 1 and ${MAX_PARTS}`,
        400,
      );
    }
    return entry;
  });
}

interface CompletedPart {
  PartNumber: number;
  ETag: string;
}

function parseParts(value: unknown): CompletedPart[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new UploadRequestError("parts must be a non-empty array", 400);
  }
  if (value.length > MAX_PARTS) {
    throw new UploadRequestError("parts contains too many entries", 400);
  }

  const parts = value.map((entry) => {
    const part = entry as { part_number?: unknown; etag?: unknown };
    if (
      typeof part.part_number !== "number" ||
      !Number.isInteger(part.part_number) ||
      part.part_number < 1 || part.part_number > MAX_PARTS
    ) {
      throw new UploadRequestError("each part needs a valid part_number", 400);
    }
    if (typeof part.etag !== "string" || !part.etag) {
      throw new UploadRequestError("each part needs an etag", 400);
    }

    const etag = part.etag.startsWith('"') ? part.etag : `"${part.etag}"`;
    return { PartNumber: part.part_number, ETag: etag };
  });

  parts.sort((a, b) => a.PartNumber - b.PartNumber);

  const hasGap = parts.some((part, index) => part.PartNumber !== index + 1);
  if (hasGap) {
    throw new UploadRequestError("parts must be numbered 1..n with no gaps", 400);
  }

  return parts;
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON" }, 400);
  }

  try {
    const action = parseAction(body.action);

    if (action === "create") {
      const target = await resolveUploadTarget(body, supabase);
      const storage = getStorageTarget(target.scope);
      const objectKey = buildObjectKey(target);

      if (Math.ceil(target.fileSize / PART_SIZE_BYTES) > MAX_PARTS) {
        throw new UploadRequestError("File is too large to upload", 400);
      }

      const created = await storage.s3.send(
        new CreateMultipartUploadCommand({
          Bucket: storage.bucket,
          Key: objectKey,
          ContentType: target.mimeType,
        }),
      );

      if (!created.UploadId) {
        throw new Error("storage did not return an upload id");
      }

      return jsonResponse({
        upload_id: created.UploadId,
        object_key: objectKey,
        mime_type: target.mimeType,
        part_size: PART_SIZE_BYTES,
        ...(storage.publicUrl
          ? { public_url: storage.publicUrl(objectKey) }
          : {}),
      }, 200);
    }

    const { scope, objectKey } = parseObjectKeyForScope(
      body.scope,
      body.object_key,
    );
    const storage = getStorageTarget(scope);
    const uploadId = parseUploadId(body.upload_id);

    if (action === "sign") {
      const partNumbers = parsePartNumbers(body.part_numbers);

      const urls = await Promise.all(
        partNumbers.map(async (partNumber) => ({
          part_number: partNumber,
          url: await getSignedUrl(
            storage.s3,
            new UploadPartCommand({
              Bucket: storage.bucket,
              Key: objectKey,
              UploadId: uploadId,
              PartNumber: partNumber,
            }),
            { expiresIn: PART_URL_EXPIRY_SECONDS },
          ),
        })),
      );

      return jsonResponse({ parts: urls }, 200);
    }

    if (action === "complete") {
      const parts = parseParts(body.parts);

      await storage.s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: storage.bucket,
          Key: objectKey,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }),
      );

      return jsonResponse({
        object_key: objectKey,
        ...(storage.publicUrl
          ? { public_url: storage.publicUrl(objectKey) }
          : {}),
      }, 200);
    }

    await storage.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: storage.bucket,
        Key: objectKey,
        UploadId: uploadId,
      }),
    );

    return jsonResponse({ aborted: true }, 200);
  } catch (error) {
    if (error instanceof UploadRequestError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    const storageError = formatStorageError(error);
    console.error("multipart-upload failed:", storageError);
    return jsonResponse(
      { error: "Could not complete the upload request" },
      storageError.status && storageError.status >= 400 &&
        storageError.status < 500
        ? 400
        : 502,
    );
  }
});
