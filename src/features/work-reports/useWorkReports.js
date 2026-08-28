import { useQuery } from "@tanstack/react-query";

import { getWorkReports } from "./workReportsApi.js";

export function useWorkReports(studentId) {
  return useQuery({
    queryKey: ["work-reports", studentId],
    queryFn: () => getWorkReports(studentId),
    enabled: Boolean(studentId),
  });
}
