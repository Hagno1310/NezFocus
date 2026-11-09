import {
  ErrorCode,
  ServerName,
  type ServerSummary,
  type UpdateServerRequest,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import type { ServerRepository } from './ServerRepository';

// S-SET-01: `overview-name-error`, lost permission (40302 closes the screen), or a failed
// save (old value back + Toast "Chưa lưu được thay đổi · Thử lại").
export type SaveServerError = 'name' | 'forbidden' | 'failed';

export type SaveServerResult =
  { ok: true; server: ServerSummary } | { ok: false; error: SaveServerError };

export async function saveServer(
  repo: Pick<ServerRepository, 'updateServer'>,
  serverId: string,
  body: UpdateServerRequest,
): Promise<SaveServerResult> {
  // SRV-01 AC2: checked on press, before the backend.
  if (body.name !== undefined && !ServerName.safeParse(body.name).success)
    return { ok: false, error: 'name' };
  try {
    const name = body.name?.trim();
    const server = await repo.updateServer(serverId, {
      ...body,
      ...(name !== undefined && { name }),
    });
    return { ok: true, server };
  } catch (err) {
    const api = asApiError(err);
    if (api?.code === ErrorCode.Forbidden || api?.code === ErrorCode.NotFound)
      return { ok: false, error: 'forbidden' };
    if (api?.code === ErrorCode.ValidationError && api.errors?.name)
      return { ok: false, error: 'name' };
    return { ok: false, error: 'failed' };
  }
}
