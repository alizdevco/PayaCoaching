import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth.js";
import { dashboardPathForRole } from "../features/auth/authRoutes.js";

export default function ProtectedRoute({
  children,
  requiredRole,
  skipProfileCompletionCheck = false,
}) {
  const { session, role, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role && role !== requiredRole) {
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
