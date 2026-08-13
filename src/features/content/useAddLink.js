import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addLink } from "./contentApi.js";

export function useAddLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, title, url }) => addLink(studentId, title, url),
    onSuccess: (_data, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ["student-content", studentId] });
    },
  });
}
