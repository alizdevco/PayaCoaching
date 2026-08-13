import { useQuery } from "@tanstack/react-query";

import { getConsultations } from "./consultationsApi.js";

export function useConsultations(studentId) {
  return useQuery({
    queryKey: ["consultations", studentId],
    queryFn: () => getConsultations(studentId),
    enabled: Boolean(studentId),
  });
}
