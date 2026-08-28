import { useAuth } from "../auth/useAuth.js";
import { useWorkReports } from "./useWorkReports.js";

export function useOwnWorkReports() {
  const { session } = useAuth();
  const studentId = session?.user?.id ?? null;

  return useWorkReports(studentId);
}
