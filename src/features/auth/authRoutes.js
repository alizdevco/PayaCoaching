// Shared post-auth redirect paths. Role always comes from profiles.role.

export function dashboardPathForRole(role, profile) {
  if (role === "admin") {
    return "/admin";
  }
  if (!profile?.profile_completed_at) {
    return "/complete-profile";
  }
  return "/student/exams";
}

/** True once profile fetch for the current session has finished (success or definitive miss). */
export function isProfileResolved({
  session,
  isLoading,
  isSessionValidated,
  isProfileLoading,
}) {
  if (!session) {
    return true;
  }
  return isSessionValidated && !isLoading && !isProfileLoading;
}

/**
 * Post-auth navigation target. Returns null while profile is still loading —
 * callers must show a loading state instead of redirecting.
 */
export function resolvePostAuthPath({
  session,
  role,
  profile,
  isProfileResolved: profileResolved,
}) {
  if (!session) {
    return "/login";
  }
  if (!profileResolved) {
    return null;
  }
  if (!role) {
    return session.user?.phone ? "/register" : "/login";
  }
  return dashboardPathForRole(role, profile);
}
