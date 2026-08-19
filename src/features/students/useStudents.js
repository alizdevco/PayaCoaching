import { useQuery } from "@tanstack/react-query";

import { listStudents } from "./studentsApi.js";

const STALE_TIME_MS = 5 * 60 * 1000;

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: listStudents,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
