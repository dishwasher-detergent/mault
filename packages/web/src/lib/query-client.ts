import type { QueryClient } from "@tanstack/react-query";

export function invalidateAppQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] !== "games",
  });
}
