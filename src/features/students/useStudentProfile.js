import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { deleteStudent, getStudentById, updateStudentProfile } from "./studentsApi.js";

export function useStudentProfile(studentId) {
  return useQuery({
    queryKey: ["student", studentId],
    queryFn: () => getStudentById(studentId),
    enabled: Boolean(studentId),
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, data }) => updateStudentProfile(studentId, data),
    onSuccess: (_data, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate("/admin/students");
    },
  });
}
