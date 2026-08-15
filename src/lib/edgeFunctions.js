// Single entry point for calling Supabase Edge Functions.
//
// supabase-js collapses every non-2xx reply into the opaque FunctionsHttpError
// message "Edge Function returned a non-2xx status code" and leaves the actual
// Response on error.context, so the server's own message has to be read from
// there or it is lost.

import { supabase } from "./supabase.js";

const SESSION_EXPIRED_MESSAGE =
  "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";

function pickErrorMessage(body) {
  if (!body) {
    return null;
  }
  if (typeof body.error === "string" && body.error) {
    return body.error;
  }
  if (typeof body.error?.message === "string" && body.error.message) {
    return body.error.message;
  }
  if (typeof body.detail === "string" && body.detail) {
    return body.detail;
  }
  return null;
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { detail: text };
    }
  } catch {
    return null;
  }
}

/**
 * An access token can stay unexpired and signature-valid after its Auth session
 * has been revoked. RLS queries still succeed with such a token, so the app
 * looks signed in while every Edge Function rejects the caller. Ask Auth
 * directly to tell a revoked session apart from a genuine authorization error.
 */
async function hasLiveSession() {
  const { error } = await supabase.auth.getUser();
  return !error;
}

/** Refresh the access token before long uploads outlive it. */
async function ensureFreshSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.expires_at) {
    return;
  }

  const expiresAtMs = session.expires_at * 1000;
  const refreshBufferMs = 5 * 60 * 1000;

  if (Date.now() >= expiresAtMs - refreshBufferMs) {
    await supabase.auth.refreshSession();
  }
}

async function invokeOnce(name, body) {
  return supabase.functions.invoke(name, { body });
}

export async function invokeEdgeFunction(name, body, { retried = false } = {}) {
  await ensureFreshSession();

  const { data, error } = await invokeOnce(name, body);

  if (error) {
    const response = error.context;
    const status = typeof response?.status === "number" ? response.status : null;
    const errorBody = response ? await readErrorBody(response) : null;

    if (status === 401 && !retried) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        return invokeEdgeFunction(name, body, { retried: true });
      }
    }

    if (status === 401 && !(await hasLiveSession())) {
      // Drop the dead session locally so the route guards ask for a new login
      // instead of every later call failing the same way.
      await supabase.auth.signOut({ scope: "local" });
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    throw new Error(pickErrorMessage(errorBody) ?? error.message);
  }

  if (data?.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error.message,
    );
  }

  return data;
}
