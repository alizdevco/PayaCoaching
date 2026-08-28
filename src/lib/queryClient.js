import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Treat cached data as fresh for a short window so navigating back to a
      // list does not trigger an immediate background refetch. Explicit
      // refetchInterval, refetch(), and invalidateQueries still override this.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});
