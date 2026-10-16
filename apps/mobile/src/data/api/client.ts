import { ApiErrorBody } from '@nezfocus/shared';

// ponytail: hand-written fetch wrapper. Switch to openapi-fetch (SRS 7.2) once the backend publishes OpenAPI.
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(json);
    throw new ApiError(
      res.status,
      parsed.success ? parsed.data : { code: 50000, message: res.statusText },
    );
  }
  return json as T;
}
