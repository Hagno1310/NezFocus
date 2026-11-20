import { inviteUrl, type InviteResponse } from '@nezfocus/shared';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';
import { useStore } from 'zustand';
import { inviteRepository } from '../../../data/invites';
import {
  DEFAULT_INVITE_SETTINGS,
  cachedInvite,
  getInvite,
  inviteCache,
  revokeInvite,
  type InviteSettings,
} from '../../../domain/invites/inviteSheet';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { firstTextChannel } from '../../../domain/servers/createServer';
import { homeStore } from '../../../domain/servers/homeStore';
import { useOnline } from '../../gateway/hooks/useOnline';

export type InviteSheetState =
  'loading' | 'default' | 'error' | 'revoked' | 'offline' | 'edit-settings';

const COPIED_MS = 4000; // C-14 toast without an action

// S-HOME-07: one invite of mine for the server's first text channel (decision 19/11/2026).
export function useInviteSheet(serverId: string) {
  const { t } = useTranslation();
  const online = useOnline();
  const server = useStore(homeStore, (s) =>
    s.servers?.find((x) => x.id === serverId),
  );
  const channels = useStore(homeStore, (s) =>
    serverId ? s.channels[serverId] : undefined,
  );
  const channelId = channels ? (firstTextChannel(channels)?.id ?? null) : null;

  // Each opening mounts afresh (InviteSheet keys it), so the first state is decided here:
  // default settings (decision 19/11/2026), offline → the cached invite if it is still live.
  const [first] = useState(() => {
    if (!channelId) return { state: 'error' as const, invite: null };
    if (gatewayStore.getState().online)
      return { state: 'loading' as const, invite: null };
    const cached = cachedInvite(inviteCache, channelId, new Date());
    return cached
      ? { state: 'default' as const, invite: cached }
      : { state: 'offline' as const, invite: null };
  });
  const [settings, setSettings] = useState(DEFAULT_INVITE_SETTINGS);
  const [draft, setDraft] = useState(DEFAULT_INVITE_SETTINGS);
  const [invite, setInvite] = useState<InviteResponse | null>(first.invite);
  const [state, setState] = useState<InviteSheetState>(first.state);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = (result: Awaited<ReturnType<typeof getInvite>>) => {
    if (result.ok) {
      setInvite(result.invite);
      setState('default');
    } else setState('error');
  };
  const load = (wanted: InviteSettings) => {
    if (!channelId) return;
    setSettings(wanted);
    setState('loading');
    void getInvite(inviteRepository, channelId, wanted, inviteCache).then(show);
  };

  useEffect(() => {
    if (first.state !== 'loading' || !channelId) return;
    let mounted = true;
    void getInvite(
      inviteRepository,
      channelId,
      DEFAULT_INVITE_SETTINGS,
      inviteCache,
    ).then((result) => {
      if (!mounted) return;
      if (result.ok) {
        setInvite(result.invite);
        setState('default');
      } else setState('error');
    });
    return () => {
      mounted = false;
    };
  }, [first.state, channelId]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const url = invite ? inviteUrl(invite.code) : null;
  return {
    serverName: server?.name ?? '',
    state,
    invite,
    url,
    settings,
    draft,
    setDraft,
    online,
    busy,
    copied,
    retry: () => load(settings),
    copy: async () => {
      if (!url) return;
      await Clipboard.setStringAsync(url);
      clearTimeout(copiedTimer.current);
      setCopied(true);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    },
    share: () => {
      if (!url || !server) return;
      void Share.share({
        message: t('invites.shareMessage', { server: server.name, url }),
      });
    },
    edit: () => {
      setDraft(settings);
      setState('edit-settings');
    },
    // `edit-settings` "Tạo link mới"; `revoked` "Tạo link mới" keeps the settings.
    newLink: (wanted: InviteSettings = settings) => load(wanted),
    revoke: async () => {
      if (!invite || busy) return;
      setBusy(true);
      const result = await revokeInvite(inviteRepository, invite, inviteCache);
      setBusy(false);
      // A failed revoke leaves the link as it was; the server still accepts it.
      if (result.ok) setState('revoked');
    },
  };
}
