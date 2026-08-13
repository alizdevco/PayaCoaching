import { useAuth } from "../auth/useAuth.js";
import { useStudentContent } from "./useStudentContent.js";

export function useOwnStudentContent() {
  const { session } = useAuth();
  const studentId = session?.user?.id ?? null;

  return useStudentContent(studentId);
}
