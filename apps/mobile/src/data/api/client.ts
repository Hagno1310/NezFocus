import {
  ApiErrorBody,
  AuthRoutes,
  ErrorCode,
  SessionEndReason,
  TokenPairResponse,
} from '@nezfocus/shared';
import type { EndReason } from '../../domain/session/sessionStore';

export const REQUEST_TIMEOUT_MS = 15_000;

export type Tokens = { access_token: string; refresh_token: string };

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

export interface ApiClientDeps {
  baseUrl: string;
  fetch: typeof fetch;
  tokens: TokenStore;
  clientHeaders: () => Record<string, string>;
  onSessionEnded: (reason: EndReason) => void;
  onAccountIncomplete: () => void;
  onUpgradeRequired: () => void;
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean; // false for public endpoints (SRS 5.2 › Xác thực)
};

// SRS 5.2 error body flattened onto the error so callers read err.code, err.errors, err.retry_after.
export class ApiError extends Error {
  readonly code: number;
  readonly errors: ApiErrorBody['errors'];
  readonly retry_after: number | null;
  readonly attempts_left: number | undefined;
  readonly reason: string | undefined;
  readonly request_id: string | undefined;

  constructor(
    readonly status: number,
    body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.errors = body.errors;
    this.retry_after = body.retry_after ?? null;
    this.attempts_left = body.attempts_left;
    this.reason = body.reason;
    this.request_id = body.request_id;
  }
}

const endReason = (reason: string | undefined): EndReason => {
  const parsed = SessionEndReason.safeParse(reason);
  return parsed.success ? parsed.data : 'expired';
};

export function createApiClient(deps: ApiClientDeps) {
  let refreshing: Promise<string | null> | null = null;

  async function send(path: string, opts: RequestOptions, token?: string) {
    const headers: Record<string, string> = {
      ...deps.clientHeaders(),
      ...opts.headers,
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    // fetch has no timeout of its own; a request the server took but never answered would hang
    // its caller, and every Solo command queued behind it.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
    const res = await deps
      .fetch(`${deps.baseUrl}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: abort.signal,
      })
      .finally(() => clearTimeout(timer));
    if (res.status === 204) return { ok: true as const, data: undefined };
    const json: unknown = await res.json().catch(() => null);
    if (res.ok) return { ok: true as const, data: json };
    return { ok: false as const, error: toApiError(res, json) };
  }

  function toApiError(res: Response, json: unknown) {
    const parsed = ApiErrorBody.safeParse(json);
    const body = parsed.success
      ? parsed.data
      : { code: ErrorCode.InternalError, message: res.statusText };
    const header = Number(res.headers.get('Retry-After'));
    if (body.retry_after == null && header > 0) body.retry_after = header;
    return new ApiError(res.status, body);
  }

  async function endSession(reason: EndReason) {
    await deps.tokens.clear();
    deps.onSessionEnded(reason);
  }

  // REQ-AUTH-04 single-flight: concurrent 40100s share one refresh; null = the session ended.
  function refresh(): Promise<string | null> {
    refreshing ??= (async () => {
      const current = await deps.tokens.get();
      if (!current) {
        await endSession('expired');
        return null;
      }
      const result = await send(AuthRoutes.refresh, {
        method: 'POST',
        body: { refresh_token: current.refresh_token },
      });
      if (!result.ok) {
        const { code, reason } = result.error;
        if (
          code === ErrorCode.TokenInvalid ||
          code === ErrorCode.RefreshTokenReused
        ) {
          await endSession(endReason(reason));
          return null;
        }
        notify(result.error);
        throw result.error;
      }
      const pair = TokenPairResponse.parse(result.data);
      await deps.tokens.set({
        access_token: pair.access_token,
        refresh_token: pair.refresh_token,
      });
      return pair.access_token;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  function notify(error: ApiError) {
    if (error.code === ErrorCode.AccountIncomplete) deps.onAccountIncomplete();
    if (error.code === ErrorCode.UpgradeRequired) deps.onUpgradeRequired();
  }

  async function request<T>(
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const auth = opts.auth ?? true;
    const sentToken = auth
      ? (await deps.tokens.get())?.access_token
      : undefined;
    let result = await send(path, opts, sentToken);

    if (!result.ok && auth && result.error.code === ErrorCode.TokenInvalid) {
      const failed = result.error;
      // A reason means the session was revoked (CR-28 #11): refreshing cannot help.
      if (failed.reason) {
        await endSession(endReason(failed.reason));
        throw failed;
      }
      // Another request may have refreshed while this one was in flight.
      const latest = (await deps.tokens.get())?.access_token;
      const token = latest && latest !== sentToken ? latest : await refresh();
      if (!token) throw failed;
      result = await send(path, opts, token);
      if (!result.ok && result.error.code === ErrorCode.TokenInvalid) {
        await endSession(endReason(result.error.reason));
      }
    }

    if (!result.ok) {
      notify(result.error);
      throw result.error;
    }
    return result.data as T;
  }

  // The Gateway refreshes through here when IDENTIFY gets 4004 without a reason.
  return { request, refresh };
}

export type ApiClient = ReturnType<typeof createApiClient>;
