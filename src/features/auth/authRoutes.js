// Shared post-auth redirect paths. Role always comes from profiles.role.

export function dashboardPathForRole(role, profile) {
  if (role === "admin") {
    return "/admin";
  }
  if (!profile?.profile_completed_at) {
    return "/complete-profile";
  }
  return "/student";
}
