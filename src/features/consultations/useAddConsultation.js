import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addConsultation } from "./consultationsApi.js";

export function useAddConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, consultantName, date, time }) =>
      addConsultation(studentId, { consultantName, date, time }),
    onSuccess: (_data, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ["consultations", studentId] });
    },
  });
}
