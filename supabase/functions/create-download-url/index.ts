
import { GetObjectCommand } from "npm:@aws-sdk/client-s3@3.726.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.726.0";
import {
  createServiceClient,
  formatStorageError,
  getArvanConfig,
  getCaller,
  handlePreflight,
  isUuid,
  jsonResponse,
} from "../_shared/edge.ts";
import {
  INVALID_LINK_URL_MESSAGE,
  isSafeExternalUrl,
} from "../_shared/urlValidation.ts";

const DOWNLOAD_URL_EXPIRY_SECONDS = 15 * 60;

async function presignPrivateObject(
  request: Request,
  filePath: string,
): Promise<string | Response> {
  const arvan = getArvanConfig();
  if (!arvan) {
    console.error("create-download-url is missing Arvan storage secrets");
    return jsonResponse(request, { error: "Storage is not configured" }, 500);
  }

  try {
    return await getSignedUrl(
      arvan.s3,
      new GetObjectCommand({
        Bucket: arvan.privateBucket,
        Key: filePath,
      }),
      { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS },
    );
  } catch (error) {
    const storageError = formatStorageError(error);
    console.error(
      "create-download-url failed to presign:",
      storageError.name,
      storageError.message,
      storageError.status,
    );
    return jsonResponse(request, 
      { error: "خطا در ایجاد آدرس دانلود. لطفاً دوباره تلاش کنید." },
      502,
    );
  }
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createServiceClient();
  const caller = await getCaller(request, supabase);
  if (!caller) return jsonResponse(request, { error: "Unauthorized" }, 401);

  let body: { content_id?: unknown; online_exam_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be JSON" }, 400);
  }

  if (isUuid(body.online_exam_id)) {
    const { data: exam } = await supabase
      .from("online_exams")
      .select("id, pdf_file_path, start_at")
      .eq("id", body.online_exam_id)
      .single();

    if (!exam) {
      return jsonResponse(request, { error: "Online exam not found" }, 404);
    }

    if (new Date(exam.start_at) > new Date()) {
      return jsonResponse(request, { error: "This exam is not available yet" }, 403);
    }

    if (!exam.pdf_file_path) {
      return jsonResponse(request, { error: "Exam PDF is not available" }, 404);
    }

    const downloadUrl = await presignPrivateObject(request, exam.pdf_file_path);
    if (downloadUrl instanceof Response) return downloadUrl;

    return jsonResponse(request, { download_url: downloadUrl, is_link: false }, 200);
  }

  if (!isUuid(body.content_id)) {
    return jsonResponse(request, 
      { error: "content_id or online_exam_id must be a valid UUID" },
      400,
    );
  }

  const { data: content } = await supabase
    .from("student_contents")
    .select("id, student_id, file_type, file_path, deleted_at")
    .eq("id", body.content_id)
    .single();

  if (!content || content.deleted_at !== null) {
    return jsonResponse(request, { error: "Content not found" }, 404);
  }

  if (caller.role !== "admin" && caller.id !== content.student_id) {
    return jsonResponse(request, { error: "You do not have access to this file" }, 403);
  }

  if (content.file_type === "link") {
    if (!isSafeExternalUrl(content.file_path)) {
      return jsonResponse(request, { error: INVALID_LINK_URL_MESSAGE }, 400);
    }
    return jsonResponse(request, { download_url: content.file_path, is_link: true }, 200);
  }

  const downloadUrl = await presignPrivateObject(request, content.file_path);
  if (downloadUrl instanceof Response) return downloadUrl;

  return jsonResponse(request, { download_url: downloadUrl, is_link: false }, 200);
});
