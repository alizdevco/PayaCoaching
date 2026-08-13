import { useAuth } from "../auth/useAuth.js";
import { useConsultations } from "./useConsultations.js";

export function useOwnConsultations() {
  const { session } = useAuth();
  const studentId = session?.user?.id ?? null;

  return useConsultations(studentId);
}
