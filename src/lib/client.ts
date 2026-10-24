export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  url: string,
  data?: unknown,
  method = data === undefined ? "GET" : "POST",
): Promise<T> {
  const result = await fetch(url, {
    method,
    headers:
      data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  const value = await result.json();
  if (!result.ok)
    throw new ApiError(
      result.status,
      value.error || "Something went wrong. Please try again.",
    );
  return value as T;
}
export function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
