import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth.js";
import { dashboardPathForRole, resolvePostAuthPath, isProfileResolved } from "../features/auth/authRoutes.js";

export default function ProtectedRoute({
  children,
  requiredRole,
  skipProfileCompletionCheck = false,
}) {
  const { session, role, profile, isLoading, isSessionValidated, isProfileLoading } = useAuth();

  const profileResolved = isProfileResolved({
    session,
    isLoading,
    isSessionValidated,
    isProfileLoading,
  });

  // AuthContext validates the local JWT with getUser() once at bootstrap.
  if (isLoading || !isSessionValidated || (session && !profileResolved)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return (
      <Navigate
        to={resolvePostAuthPath({
          session,
          role,
          profile,
          isProfileResolved: profileResolved,
        })}
        replace
      />
    );
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={dashboardPathForRole(role, profile)} replace />;
  }

  if (
    requiredRole === "student" &&
    role === "student" &&
    !skipProfileCompletionCheck &&
    profile &&
    !profile.profile_completed_at
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}
