import {
  ErrorCode,
  parseInviteInput,
  type InvitePreview,
  type ServerResponse,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import { firstTextChannel } from '../servers/createServer';
import type { OpenChannel } from '../servers/drawer';
import {
  homeStore,
  openChannel,
  selectServer,
  setServerDetail,
} from '../servers/homeStore';
import type { ServerRepository } from '../servers/ServerRepository';
import type { InviteRepository } from './InviteRepository';

// S-HOME-06 `join-error` (spec 02).
export type LookupError =
  'bad-format' | 'invalid' | 'rate-limited' | 'network' | 'other';

// S-MOD-01 states after "Tham gia" (spec 10).
export type JoinError =
  'invalid' | 'banned' | 'max-servers' | 'network' | 'other';

const lookupErrorOf = (err: unknown): LookupError => {
  const e = asApiError(err);
  if (!e) return 'network';
  if (e.code === ErrorCode.InviteInvalid) return 'invalid';
  if (e.code === ErrorCode.RateLimited) return 'rate-limited';
  return 'other';
};

const joinErrorOf = (err: unknown): JoinError => {
  const e = asApiError(err);
  if (!e) return 'network';
  if (e.code === ErrorCode.InviteInvalid) return 'invalid';
  if (e.code === ErrorCode.BannedFromServer) return 'banned';
  if (e.code === ErrorCode.MaxServersReached) return 'max-servers';
  return 'other';
};

// "Tiếp tục": the code (taken out of a pasted link) is checked before anything is sent.
export async function lookupInvite(
  repo: Pick<InviteRepository, 'previewInvite'>,
  text: string,
): Promise<
  | { ok: true; code: string; channelId?: string; preview: InvitePreview }
  | { ok: false; error: LookupError }
> {
  const parsed = parseInviteInput(text);
  if (!parsed) return { ok: false, error: 'bad-format' };
  try {
    const preview = await repo.previewInvite(parsed.code);
    return { ok: true, ...parsed, preview };
  } catch (err) {
    return { ok: false, error: lookupErrorOf(err) };
  }
}

export async function joinInvite(
  repo: Pick<InviteRepository, 'acceptInvite'>,
  code: string,
): Promise<
  { ok: true; server: ServerResponse } | { ok: false; error: JoinError }
> {
  try {
    return { ok: true, server: await repo.acceptInvite(code) };
  } catch (err) {
    return { ok: false, error: joinErrorOf(err) };
  }
}

export type Destination = { kind: 'channel' | 'room'; channelId: string };

// A channel of the server the user can view (the server lists only those), as a destination.
function target(server: ServerResponse, channelId: string | undefined) {
  const channel = server.channels.find((c) => c.id === channelId);
  if (channel?.type === 'voice')
    return { kind: 'room' as const, channelId: channel.id };
  if (channel?.type === 'text')
    return { kind: 'channel' as const, channelId: channel.id };
  return null;
}

function firstChannel(server: ServerResponse): Destination | null {
  const first = firstTextChannel(server.channels);
  return first ? { kind: 'channel', channelId: first.id } : null;
}

// S-MOD-01 Tham gia → the room of a room invite (`not-joined`, no voice connection, VC-01) or
// the `?channel=` target, else the first text channel the user can view (#chao-mung).
export const joinDestination = (
  server: ServerResponse,
  preview: InvitePreview,
  channelParam: string | undefined,
): Destination | null =>
  target(server, channelParam) ??
  target(server, preview.channel?.id) ??
  firstChannel(server);

// already-member: `?channel=`, else the channel open in that server (decision 19/11/2026),
// else the first text channel.
export const memberDestination = (
  server: ServerResponse,
  channelParam: string | undefined,
  open: OpenChannel | null,
): Destination | null =>
  target(server, channelParam) ??
  (open?.serverId === server.id ? target(server, open.channelId) : null) ??
  firstChannel(server);

export { formatInviteCount as formatCount } from '@nezfocus/shared';

// Shows the destination in Home: a text channel opens in the drawers, a room goes to its
// preview (S-ROOM-01/02 `not-joined`), never connecting voice (VC-01).
export function arrive(serverId: string, to: Destination) {
  if (to.kind === 'channel') openChannel({ serverId, channelId: to.channelId });
  else selectServer(serverId);
}

// already-member: the server as the app knows it, fetched if its channels were never loaded.
export async function arriveAsMember(
  repo: Pick<ServerRepository, 'getServer'>,
  serverId: string,
  channelParam: string | undefined,
): Promise<Destination | null> {
  const home = homeStore.getState();
  let server = home.channels[serverId]
    ? ({ id: serverId, channels: home.channels[serverId] } as ServerResponse)
    : null;
  if (!server) {
    try {
      server = await repo.getServer(serverId);
      setServerDetail(server);
    } catch {
      return null;
    }
  }
  const to = memberDestination(server, channelParam, home.open);
  if (to) arrive(serverId, to);
  return to;
}
