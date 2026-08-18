const AUTH_ROUTE_PREFIXES = ["/login", "/register"];
const PROTECTED_ROUTE_PREFIXES = ["/admin", "/student", "/complete-profile"];

function getSupabaseAuthStorageKey() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    return null;
  }

  try {
    const projectRef = new URL(url).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

/** Cheap localStorage check — avoids loading the Supabase client on cold landing visits. */
export function hasStoredSessionHint() {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) {
    return false;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw);
    return Boolean(
      parsed?.access_token ??
        parsed?.currentSession?.access_token ??
        parsed?.[0]?.access_token,
    );
  } catch {
    return false;
  }
}

export function requiresImmediateAuth(pathname) {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** True when Supabase must load before this route can behave correctly. */
export function requiresAuthBootstrap(pathname) {
  if (hasStoredSessionHint()) {
    return true;
  }

  if (requiresImmediateAuth(pathname)) {
    return true;
  }

  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Cold public visitors can render immediately without waiting on Supabase. */
export function shouldDeferAuthBootstrap(pathname) {
  return !requiresAuthBootstrap(pathname);
}
