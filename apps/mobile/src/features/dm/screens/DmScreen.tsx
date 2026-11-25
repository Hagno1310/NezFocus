import { CANNOT_MESSAGE_TEXT, type ServerMember } from '@nezfocus/shared';
import { randomUUID } from 'expo-crypto';
import { Ban, Lock, UserRound } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { friendActions } from '../../../data/friends';
import { dmStore } from '../../../domain/dm/dmStore';
import { dmScreen } from '../../../domain/dm/dmScreen';
import { friendsStore } from '../../../domain/friends/friends';
import { space } from '../../../shared/theme';
import { ActivityLine } from '../../../shared/ui/ActivityLine';
import { Button } from '../../../shared/ui/Button';
import { ChannelHeader } from '../../../shared/ui/Chat';
import { Avatar } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { ChatView } from '../../chat/components/ChatView';
import { BlockDialog } from '../../friends/components/BlockDialog';
import { useUserProfile } from '../../friends/hooks/useUserProfile';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { avatarUri } from '../../me/avatarUri';
import { useMe } from '../../me/hooks/useMe';
import { usePresence } from '../../presence/hooks/usePresence';
import { TypingLine } from '../../typing/components/TypingLine';
import { DmStrip } from '../components/DmStrip';
import { dmName } from './DmList';

const asMember = (u: ServerMember['user']): ServerMember => ({
  user: u,
  role_ids: [],
  joined_at: new Date(0).toISOString(),
  timeout_until: null,
});

// S-DM-02: the channel chat (ChatView) with the DM header, strips and composer states.
export function DmScreen({
  channelId,
  onOpenLeft,
  onOpenProfile,
}: {
  channelId: string;
  onOpenLeft: () => void;
  onOpenProfile?: (userId: string) => void; // S-HOME-10 outside a server (P2-B3.4 #117)
}) {
  const { t } = useTranslation();
  const dm = useStore(dmStore, (s) => s.byId[channelId]);
  const me = useMe().data;
  const other = dm?.recipient;
  const otherId = other?.id ?? null;
  const profile = useUserProfile(otherId).data;
  const relationship = useStore(friendsStore, (s) =>
    otherId ? (s.byUser[otherId]?.type ?? 'none') : 'none',
  );
  const presence = usePresence(otherId ?? '');
  // S-DM-EDGE `blocked-mid-chat`: a refused send locks the composer at once.
  const [refused, setRefused] = useState(false);
  const onCannotMessage = useCallback(() => setRefused(true), []);
  const [blocking, setBlocking] = useState(false);
  const [busy, setBusy] = useState(false);
  const people = useMemo(
    () =>
      other && me
        ? [
            asMember({
              id: me.id,
              username: me.username,
              display_name: me.display_name,
              avatar: me.avatar,
            }),
            asMember(other),
          ]
        : undefined,
    [me, other],
  );
  if (!dm || !other) return null;

  const name = dmName(dm, t('dm.deleted'));
  const state = dmScreen({
    deleted: other.deleted,
    relationship,
    canMessage: !refused && (profile?.can_message ?? true),
    status: presence.status,
    activity: presence.activity,
  });

  const run = (action: () => Promise<unknown>) => {
    setBusy(true);
    action()
      .catch(() => showToast({ message: t('friends.addSheet.errors.generic') }))
      .finally(() => setBusy(false));
  };
  const block = (
    <Button
      variant="text"
      size="S"
      label={t('dm.block')}
      onPress={() => setBlocking(true)}
    />
  );
  const strip =
    state.strip === 'not-friend' ? (
      <DmStrip icon={UserRound} text={t('dm.notFriend', { name })}>
        <Button
          variant="secondary"
          size="S"
          label={t('dm.addFriend')}
          loading={busy}
          onPress={() =>
            run(() => friendActions.send({ user_id: other.id }, randomUUID()))
          }
        />
        {block}
      </DmStrip>
    ) : state.strip === 'request-received' ? (
      <DmStrip icon={UserRound} text={t('dm.wantsFriend', { name })}>
        <Button
          size="S"
          label={t('dm.accept')}
          loading={busy}
          onPress={() => run(() => friendActions.accept(other.id))}
        />
        {block}
      </DmStrip>
    ) : state.strip === 'request-sent' ? (
      <DmStrip icon={UserRound} text={t('dm.requestSent', { name })}>
        <Button
          variant="text"
          size="S"
          label={t('dm.cancelRequest')}
          loading={busy}
          onPress={() => run(() => friendActions.remove(other.id))}
        />
        {block}
      </DmStrip>
    ) : null;

  const sub =
    state.sub?.kind === 'activity' ? (
      <ActivityLine activity={state.sub.activity} form="full" />
    ) : undefined;

  return (
    <>
      <ChatView
        key={channelId}
        channelId={channelId}
        serverId={null}
        channelName={name}
        placeholder={t('dm.placeholder', { name })}
        people={people}
        hideBlocked
        onCannotMessage={onCannotMessage}
        header={
          <ChannelHeader
            leading={
              <Avatar
                name={name}
                uri={avatarUri(other.avatar, '128')}
                deleted={other.deleted}
                size={28}
                presence={state.dot ? presence.status : undefined}
              />
            }
            title={name}
            username={other.deleted ? undefined : (other.username ?? undefined)}
            subline={sub}
            subtitle={
              state.sub?.kind === 'status'
                ? t(`dm.status.${state.sub.status}`)
                : undefined
            }
            onMenu={onOpenLeft}
            // ponytail: 📞 🎥 on the right come with P3-B6.3 (#157); hidden until then.
            onPressTitle={
              onOpenProfile ? () => onOpenProfile(other.id) : undefined
            }
          />
        }
        belowHeader={
          <>
            <ConnectionBanner />
            {strip}
          </>
        }
        start={
          <View style={styles.start}>
            <Avatar
              name={name}
              uri={avatarUri(other.avatar, '256')}
              deleted={other.deleted}
              size={96}
            />
            <Text variant="title-2" accessibilityRole="header">
              {name}
            </Text>
            {!other.deleted && other.username && (
              <Text color="text-secondary">{other.username}</Text>
            )}
            <Text color="text-secondary">{t('dm.start', { name })}</Text>
          </View>
        }
        aboveComposer={<TypingLine channelId={channelId} />}
        disabled={
          state.bottom === 'cannot'
            ? { icon: Lock, text: CANNOT_MESSAGE_TEXT }
            : state.bottom === 'deleted'
              ? { icon: Lock, text: t('dm.deletedComposer') }
              : undefined
        }
        composer={
          state.bottom === 'blocked-by-me' ? (
            <DmStrip icon={Ban} text={t('dm.blockedByMe', { name })}>
              <Button
                variant="secondary"
                size="S"
                label={t('dm.unblock')}
                loading={busy}
                onPress={() => run(() => friendActions.remove(other.id))}
              />
            </DmStrip>
          ) : undefined
        }
      />
      <BlockDialog
        user={blocking ? { id: other.id, name } : null}
        onDismiss={() => setBlocking(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // S-DM-02 `new-dm`: pad 16/16/24/16, gap 8, left-aligned.
  start: {
    gap: space[2],
    paddingTop: space[3],
    paddingHorizontal: space[3],
    paddingBottom: space[4],
  },
});
