import { QueryClient } from "@tanstack/react-query";

function shouldRetryRequest(failureCount, error) {
  const status = error?.response?.status;

  if (status && status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  return failureCount < 1;
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: shouldRetryRequest,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
