export async function post<T = Record<string, unknown>>(
  url: string,
  data: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok || result.ok === false)
    throw new Error(
      result.message || "Chưa thực hiện được thao tác. Hãy thử lại.",
    );
  return result as T;
}
