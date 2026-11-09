import {
  Permission,
  hasPermission,
  type ChannelResponse,
  type PermissionName,
  type PermissionOverwrite,
} from '@nezfocus/shared';
import { Shield } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { serverRepository } from '../../../data/servers';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { withTri, type Tri } from '../../../domain/servers/channelPermissions';
import { homeStore, upsertChannel } from '../../../domain/servers/homeStore';
import { roleErrorOf } from '../../../domain/servers/roles';
import { showToast } from '../../../shared/ui/Toast';
import { useServerAccess } from './useServerAccess';

export type Target = Pick<PermissionOverwrite, 'target_id' | 'target_type'>;
const same = (a: Target) => (b: Target) =>
  a.target_id === b.target_id && a.target_type === b.target_type;

// S-SET-06 `overwrites` / `overwrite-edit`: the channel (or category) as the drawer knows
// it, the caller's permissions in it, and the writes. Losing MANAGE_CHANNELS there, or the
// channel, closes the screen (spec 08 › Edge case S-SET-07 & S-SET-06).
export function useOverwrites(
  serverId: string,
  channelId: string,
  onClose: () => void,
) {
  const { t } = useTranslation();
  const access = useServerAccess(serverId);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const channels = useStore(homeStore, (s) => s.channels[serverId]);
  const channel = channels?.find((c) => c.id === channelId);
  const parent = channels?.find((c) => c.id === channel?.parent_id);
  const [seen, setSeen] = useState(false);
  if (channel && !seen) setSeen(true);

  const perms = access && channel ? access.channelPerms(channel) : 0n;
  const deleted = seen && channels !== undefined && !channel;
  const lost =
    !deleted &&
    !!access &&
    access.roles !== undefined &&
    !!channel &&
    !hasPermission(perms, Permission.MANAGE_CHANNELS);
  const leave = (why: 'deleted' | 'lost') => {
    showToast({
      message:
        why === 'deleted'
          ? t('servers.channels.channelDeleted')
          : t('servers.channels.lostAccess'),
    });
    onClose();
  };
  const close = useEffectEvent(leave);
  useEffect(() => {
    if (deleted) close('deleted');
    else if (lost) close('lost');
  }, [deleted, lost]);

  // Each save sends every step still in flight for its target (two quick taps never undo
  // each other); a refused one goes back with "Chưa lưu được thay đổi · Thử lại".
  const inFlight = useRef(new Map<string, Map<PermissionName, Tri>>());
  const [pending, setPending] = useState<Record<string, Tri>>({});
  const keyOf = (o: Target) => `${o.target_type}:${o.target_id}`;
  const refresh = () => {
    const next: Record<string, Tri> = {};
    for (const [k, m] of inFlight.current)
      for (const [name, tri] of m) next[`${k}:${name}`] = tri;
    setPending(next);
  };

  const fail = (err: unknown, retry: () => void) => {
    const error = roleErrorOf(err);
    if (error === 'forbidden' || error === 'gone') return leave('lost');
    if (error === 'hierarchy')
      return showToast({ message: t('servers.roles.outranked'), icon: Shield });
    showToast({
      message: t('servers.settings.saveFailed'),
      action: { label: t('servers.settings.retry'), onPress: retry },
    });
  };

  const current = (): ChannelResponse | undefined =>
    homeStore.getState().channels[serverId]?.find((c) => c.id === channelId);

  const setTri = async (target: Target, name: PermissionName, tri: Tri) => {
    const key = keyOf(target);
    const steps = inFlight.current.get(key) ?? new Map<PermissionName, Tri>();
    steps.set(name, tri);
    inFlight.current.set(key, steps);
    refresh();
    let bits = current()?.permission_overwrites.find(same(target));
    for (const [n, v] of steps) bits = { ...target, ...withTri(bits, n, v) };
    const next = { ...target, ...bits! };
    const empty = next.allow === '0' && next.deny === '0';
    try {
      if (empty)
        await serverRepository.deleteChannelPermission(
          channelId,
          target.target_id,
        );
      else
        await serverRepository.setChannelPermission(
          channelId,
          target.target_id,
          {
            target_type: target.target_type,
            allow: next.allow,
            deny: next.deny,
          },
        );
      const now = current();
      if (now)
        upsertChannel({
          ...now,
          permission_overwrites: [
            ...now.permission_overwrites.filter((o) => !same(target)(o)),
            ...(empty ? [] : [next]),
          ],
        });
      if (steps.get(name) === tri) steps.delete(name);
      refresh();
    } catch (err) {
      if (steps.get(name) === tri) steps.delete(name);
      refresh();
      fail(err, () => void setTri(target, name, tri));
    }
  };

  // v1.7: off copies the category's overwrites (no question asked), on drops the channel's.
  const setSynced = async (synced: boolean) => {
    try {
      upsertChannel(
        await serverRepository.updateChannel(channelId, {
          permissions_synced: synced,
        }),
      );
    } catch (err) {
      fail(err, () => void setSynced(synced));
    }
  };

  return {
    access,
    channel,
    parent,
    channels: channels ?? [],
    perms,
    offline,
    pendingTri: (target: Target, name: PermissionName) =>
      pending[`${keyOf(target)}:${name}`],
    setTri,
    setSynced,
  };
}
