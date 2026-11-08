import {
  ErrorCode,
  ServerName,
  type ChannelResponse,
  type ServerResponse,
  type ServerTemplate,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import type { ServerRepository } from './ServerRepository';

// S-HOME-06 create-error / name error. The name is checked on press (SRV-01 AC2).
export type CreateServerError = 'name' | 'max-servers' | 'network' | 'other';

export type CreateServerResult =
  | { ok: true; server: ServerResponse; channel: ChannelResponse | null }
  | { ok: false; error: CreateServerError };

// Uncategorized channels sit on top (v1.8), then each category in order (S-HOME-02).
export function firstTextChannel(
  channels: readonly ChannelResponse[],
): ChannelResponse | null {
  const byPosition = (a: ChannelResponse, b: ChannelResponse) =>
    a.position - b.position;
  const groups = [
    null,
    ...channels
      .filter((c) => c.type === 'category')
      .sort(byPosition)
      .map((c) => c.id),
  ];
  for (const group of groups) {
    const text = channels
      .filter((c) => c.type === 'text' && c.parent_id === group)
      .sort(byPosition)[0];
    if (text) return text;
  }
  return null;
}

const errorOf = (err: unknown): CreateServerError => {
  const e = asApiError(err);
  if (!e) return 'network';
  if (e.code === ErrorCode.MaxServersReached) return 'max-servers';
  // Only `name` can be wrong in what the app sends; anything else is a bug on one side.
  if (e.code === ErrorCode.ValidationError && e.errors?.name) return 'name';
  return 'other';
};

// SRV-01: create, then open the first text channel the creator can view (#general).
export async function createServer(
  repo: ServerRepository,
  template: ServerTemplate,
  rawName: string,
): Promise<CreateServerResult> {
  const name = ServerName.safeParse(rawName);
  if (!name.success) return { ok: false, error: 'name' };
  try {
    const server = await repo.createServer({ name: name.data, template });
    return { ok: true, server, channel: firstTextChannel(server.channels) };
  } catch (err) {
    return { ok: false, error: errorOf(err) };
  }
}
