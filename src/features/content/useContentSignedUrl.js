import { useQuery } from "@tanstack/react-query";

import { getDownloadUrl } from "./contentApi.js";

export function useContentSignedUrl(contentId) {
  return useQuery({
    queryKey: ["content-download-url", contentId],
    queryFn: () => getDownloadUrl(contentId),
    enabled: Boolean(contentId),
  });
}
