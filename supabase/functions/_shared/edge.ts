// Shared helpers for storage-related Edge Functions.
//
// Authorization always reads the role from public.profiles via the service
// role client — never from client-editable JWT metadata.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { S3Client } from "npm:@aws-sdk/client-s3@3.726.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handlePreflight(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  return null;
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export interface Caller {
  id: string;
  role: "admin" | "student";
}

/** Resolves the calling user and their profile role, or null if unauthenticated. */
export async function getCaller(
  request: Request,
  supabase: SupabaseClient,
): Promise<Caller | null> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "student") return null;
  return { id: data.user.id, role: profile.role };
}

interface ArvanS3Base {
  s3: S3Client;
  endpoint: string;
}

function createArvanS3Client(): ArvanS3Base | null {
  const endpoint = Deno.env.get("ARVAN_ENDPOINT");
  const accessKeyId = Deno.env.get("ARVAN_ACCESS_KEY");
  const secretAccessKey = Deno.env.get("ARVAN_SECRET_KEY");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  // e.g. https://s3.ir-thr-at1.arvanstorage.ir -> ir-thr-at1
  const region = new URL(endpoint).hostname.split(".")[1] ?? "ir-thr-at1";

  const s3 = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    // Arvan (and other S3-compatible providers) reject checksum query params on
    // presigned URLs and may not implement CRC32 — skip SDK default checksums.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return { s3, endpoint };
}

/** Permanent public URL for objects in the public Arvan bucket. */
export function buildPublicObjectUrl(
  bucket: string,
  objectKey: string,
  _endpoint: string,
): string {
  const normalizedKey = objectKey.replace(/^\//, "");
  return `https://${bucket}.s3.ir-thr-at1.arvanstorage.ir/${normalizedKey}`;
}

export function getArvanConfig() {
  const base = createArvanS3Client();
  const privateBucket = Deno.env.get("ARVAN_PRIVATE_BUCKET");

  if (!base || !privateBucket) {
    return null;
  }

  return { s3: base.s3, privateBucket };
}

export function getArvanPublicConfig() {
  const base = createArvanS3Client();
  const publicBucket = Deno.env.get("ARVAN_PUBLIC_BUCKET");

  if (!base || !publicBucket) {
    return null;
  }

  return {
    s3: base.s3,
    publicBucket,
    publicUrl: (objectKey: string) =>
      buildPublicObjectUrl(publicBucket, objectKey, base.endpoint),
  };
}

export function formatStorageError(error: unknown) {
  const err = error as {
    name?: string;
    message?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return {
    name: err.name ?? err.Code ?? "S3Error",
    message: err.message ?? "Unknown storage error",
    status: err.$metadata?.httpStatusCode ?? null,
  };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
}
