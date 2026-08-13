import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listStudents } from "./studentsApi.js";

export function useStudents({ search = "", page = 1, pageSize = 10 } = {}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  return useQuery({
    queryKey: ["students", { search: debouncedSearch, page }],
    queryFn: () =>
      listStudents({ search: debouncedSearch, page, pageSize }),
  });
}
