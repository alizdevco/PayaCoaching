import { useQuery } from "@tanstack/react-query";

import { getOnlineExamAttemptWithLazyFinalize } from "./onlineExamsApi.js";

export function useOnlineExamAttempt(examId) {
  return useQuery({
    queryKey: ["online-exam-attempt", examId],
    queryFn: () => getOnlineExamAttemptWithLazyFinalize(examId),
    enabled: Boolean(examId),
  });
}
