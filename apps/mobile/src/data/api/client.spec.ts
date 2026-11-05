import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, type Tokens } from './client';

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });

function memoryTokens(initial: Tokens | null) {
  let tokens = initial;
  return {
    get: async () => tokens,
    set: async (t: Tokens) => {
      tokens = t;
    },
    clear: vi.fn(async () => {
      tokens = null;
    }),
    peek: () => tokens,
  };
}

// Backend stand-in: only `validAccess` passes; /auth/refresh answers with `refreshReply`.
function setup({
  refreshReply = () =>
    json(200, { access_token: 'a2', refresh_token: 'r2', expires_in: 900 }),
  route = (): Response => json(200, { ok: true }),
}: {
  refreshReply?: () => Response;
  route?: (path: string, init: RequestInit) => Response;
} = {}) {
  let validAccess = 'a2';
  const tokens = memoryTokens({ access_token: 'a1', refresh_token: 'r1' });
  const onSessionEnded = vi.fn();
  const onAccountIncomplete = vi.fn();
  const onUpgradeRequired = vi.fn();
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const path = url.replace('http://api', '');
    await Promise.resolve(); // let concurrent requests interleave
    if (path === '/auth/refresh') return refreshReply();
    const auth = new Headers(init.headers).get('Authorization');
    if (auth && auth !== `Bearer ${validAccess}`)
      return json(401, { code: ErrorCode.TokenInvalid, message: 'expired' });
    return route(path, init);
  });
  const client = createApiClient({
    baseUrl: 'http://api',
    fetch: fetch as unknown as typeof globalThis.fetch,
    tokens,
    clientHeaders: () => ({
      'X-Client-Platform': 'android',
      'X-Client-Version': '0.1.0',
      'Accept-Language': 'vi',
    }),
    onSessionEnded,
    onAccountIncomplete,
    onUpgradeRequired,
  });
  const refreshCalls = () =>
    fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')).length;
  return {
    client,
    fetch,
    tokens,
    onSessionEnded,
    onAccountIncomplete,
    onUpgradeRequired,
    refreshCalls,
    expire: (next: string) => (validAccess = next),
  };
}

describe('ApiClient', () => {
  it('sends the three SRS 5.2 client headers and the bearer token', async () => {
    const { client, fetch, expire } = setup();
    expire('a1');
    await client.request('/users/@me');
    const headers = new Headers(fetch.mock.calls[0][1].headers);
    expect(headers.get('X-Client-Platform')).toBe('android');
    expect(headers.get('X-Client-Version')).toBe('0.1.0');
    expect(headers.get('Accept-Language')).toBe('vi');
    expect(headers.get('Authorization')).toBe('Bearer a1');
  });

  it('public requests carry no token', async () => {
    const { client, fetch } = setup();
    await client.request('/auth/login', { method: 'POST', auth: false });
    expect(
      new Headers(fetch.mock.calls[0][1].headers).has('Authorization'),
    ).toBe(false);
  });

  it('AUTH-04 AC4: five requests on an expired token send one refresh', async () => {
    const { client, refreshCalls, tokens } = setup();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => client.request('/users/@me')),
    );
    expect(results).toEqual(Array(5).fill({ ok: true }));
    expect(refreshCalls()).toBe(1);
    expect(tokens.peek()).toEqual({ access_token: 'a2', refresh_token: 'r2' });
  });

  it('later requests use the refreshed token', async () => {
    const { client, refreshCalls } = setup();
    await client.request('/users/@me');
    await client.request('/users/@me');
    expect(refreshCalls()).toBe(1);
  });

  it('AUTH-04 AC3: refresh answers 40100 → tokens cleared, session ends as expired', async () => {
    const { client, tokens, onSessionEnded } = setup({
      refreshReply: () =>
        json(401, { code: ErrorCode.TokenInvalid, message: 'expired' }),
    });
    await expect(client.request('/users/@me')).rejects.toMatchObject({
      code: ErrorCode.TokenInvalid,
    });
    expect(tokens.clear).toHaveBeenCalled();
    expect(onSessionEnded).toHaveBeenCalledWith('expired');
  });

  it('AUTH-04 AC5: refresh token reuse ends the session with its reason', async () => {
    const { client, onSessionEnded } = setup({
      refreshReply: () =>
        json(401, {
          code: ErrorCode.RefreshTokenReused,
          message: 'reused',
          reason: 'reuse_detected',
        }),
    });
    await expect(client.request('/users/@me')).rejects.toBeInstanceOf(ApiError);
    expect(onSessionEnded).toHaveBeenCalledWith('reuse_detected');
  });

  it('40100 with a reason on any API ends the session without refreshing', async () => {
    const { client, refreshCalls, onSessionEnded, expire } = setup({
      route: () =>
        json(401, {
          code: ErrorCode.TokenInvalid,
          message: 'revoked',
          reason: 'revoked',
        }),
    });
    expire('a1');
    await expect(client.request('/servers')).rejects.toBeInstanceOf(ApiError);
    expect(refreshCalls()).toBe(0);
    expect(onSessionEnded).toHaveBeenCalledWith('revoked');
  });

  it('an unknown reason falls back to the generic expired message', async () => {
    const { client, onSessionEnded } = setup({
      refreshReply: () =>
        json(401, {
          code: ErrorCode.TokenInvalid,
          message: 'x',
          reason: 'admin_only',
        }),
    });
    await expect(client.request('/users/@me')).rejects.toBeInstanceOf(ApiError);
    expect(onSessionEnded).toHaveBeenCalledWith('expired');
  });

  it('refresh failing on the network keeps the session', async () => {
    const { client, tokens, onSessionEnded } = setup({
      refreshReply: () => {
        throw new TypeError('Network request failed');
      },
    });
    await expect(client.request('/users/@me')).rejects.toThrow(
      'Network request failed',
    );
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(tokens.peek()?.refresh_token).toBe('r1');
  });

  it('AUTH-01 AC5: 40309 anywhere opens Complete account', async () => {
    const { client, onAccountIncomplete, expire } = setup({
      route: () =>
        json(403, { code: ErrorCode.AccountIncomplete, message: 'x' }),
    });
    expire('a1');
    await expect(client.request('/servers')).rejects.toMatchObject({
      code: ErrorCode.AccountIncomplete,
    });
    expect(onAccountIncomplete).toHaveBeenCalled();
  });

  it('NFR-MOB-12: 42601 opens Update required', async () => {
    const { client, onUpgradeRequired } = setup({
      route: () => json(426, { code: ErrorCode.UpgradeRequired, message: 'x' }),
    });
    await expect(
      client.request('/auth/login', { method: 'POST', auth: false }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUpgradeRequired).toHaveBeenCalled();
  });

  it('maps the error body to code, message, errors, retry_after', async () => {
    const { client } = setup({
      route: () =>
        json(
          429,
          {
            code: ErrorCode.RateLimited,
            message: 'Thử lại sau',
            errors: { email: [{ code: 'INVALID', message: 'x' }] },
          },
          { 'Retry-After': '600' },
        ),
    });
    const err = await client
      .request('/auth/login', { method: 'POST', auth: false })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({
      status: 429,
      code: ErrorCode.RateLimited,
      message: 'Thử lại sau',
      errors: { email: [{ code: 'INVALID', message: 'x' }] },
      retry_after: 600,
    });
  });

  it('a body that is not an SRS error still becomes an ApiError', async () => {
    const { client } = setup({
      route: () => new Response('<html>Bad gateway</html>', { status: 502 }),
    });
    await expect(
      client.request('/health', { auth: false }),
    ).rejects.toMatchObject({ status: 502, code: ErrorCode.InternalError });
  });

  it('sends a JSON body', async () => {
    const { client, fetch } = setup();
    await client.request('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: 'an@x.vn' },
    });
    const init = fetch.mock.calls[0][1];
    expect(init.body).toBe('{"email":"an@x.vn"}');
    expect(new Headers(init.headers).get('Content-Type')).toBe(
      'application/json',
    );
  });
});
