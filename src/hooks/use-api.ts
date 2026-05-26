import useSWR from "swr";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("API 요청 실패");
    throw error;
  }
  return res.json();
}

export function useApi<T>(url: string | null) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
  });
}
