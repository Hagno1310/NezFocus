import { CANNOT_MESSAGE_TEXT } from '@nezfocus/shared';
import * as Clipboard from 'expo-clipboard';
import { randomUUID } from 'expo-crypto';
import {
  Ban,
  Check,
  Copy,
  Ellipsis,
  Lock,
  MessageCircle,
  Pencil,
  Send,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { friendActions } from '../../../data/friends';
import { localMessages } from '../../../data/messages';
import { friendsStore } from '../../../domain/friends/friends';
import {
  closeMemberProfile,
  profileSheet,
  type ProfileTarget,
} from '../../../domain/friends/profileSheet';
import { profileView } from '../../../domain/friends/profileView';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { hideDmList } from '../../../domain/dm/dmStore';
import {
  homeStore,
  openChannel,
  selectServer,
} from '../../../domain/servers/homeStore';
import { railInitials } from '../../../domain/servers/drawer';
import { memberRightLabel, sinceText } from '../../../domain/servers/members';
import { sessionStore } from '../../../domain/session/sessionStore';
import { radius, space, useTheme } from '../../../shared/theme';
import { ActivityLine } from '../../../shared/ui/ActivityLine';
import { Button, IconButton } from '../../../shared/ui/Button';
import { ChipStatus } from '../../../shared/ui/ChipStatus';
import { Icon } from '../../../shared/ui/Icon';
import { ActionSheet, BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { openDmWith } from '../../dm/openDm';
import { avatarUri } from '../../me/avatarUri';
import { usePresence } from '../../presence/hooks/usePresence';
import { useMembers } from '../../servers/hooks/useMembers';
import { useUserProfile } from '../hooks/useUserProfile';
import { BlockDialog } from './BlockDialog';

// S-HOME-10, mounted once above the tabs; it keeps the last person while it animates out.
export function ProfileSheetHost({
  onOpenedDm,
  onEditProfile,
  onOpenedServer,
}: {
  onOpenedDm: () => void; // show the Home tab root, where the DM now is
  onEditProfile: () => void; // S-ME-01
  onOpenedServer: () => void;
}) {
  const target = useStore(profileSheet, (s) => s.target);
  const visible = useStore(profileSheet, (s) => s.visible);
  if (!target) return null;
  return (
    <ProfileSheet
      target={target}
      visible={visible}
      onOpenedDm={onOpenedDm}
      onEditProfile={onEditProfile}
      onOpenedServer={onOpenedServer}
    />
  );
}

function ProfileSheet({
  target,
  visible,
  onOpenedDm,
  onEditProfile,
  onOpenedServer,
}: {
  target: ProfileTarget;
  visible: boolean;
  onOpenedDm: () => void;
  onEditProfile: () => void;
  onOpenedServer: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { timeZone } = useChatClock();
  const { userId, serverId } = target;
  const profile = useUserProfile(userId).data;
  const presence = usePresence(userId);
  const meId = useStore(sessionStore, (s) => s.user?.id ?? null);
  const live = useStore(friendsStore, (s) => s.byUser[userId]?.type);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const server = useStore(homeStore, (s) =>
    s.servers?.find((x) => x.id === serverId),
  );
  const roles = useStore(homeStore, (s) =>
    serverId ? s.roles[serverId] : undefined,
  );
  const member = useMembers(serverId ?? '').data?.find(
    (m) => m.user.id === userId,
  );
  const [menu, setMenu] = useState(false);
  const [unfriend, setUnfriend] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [busy, setBusy] = useState(false);

  const self = userId === meId;
  const relationship = live ?? profile?.relationship ?? 'none';
  const deleted = !!profile?.deleted;
  const name = deleted
    ? t('dm.deleted')
    : (profile?.user.display_name ?? profile?.user.username ?? '');
  const v = profileView({
    self,
    deleted,
    relationship,
    canMessage: profile?.can_message ?? true,
    inServer: !!serverId,
    fromTheirDm: target.fromTheirDm,
    activity: presence.activity,
  });

  const run = (action: () => Promise<unknown>) => {
    setBusy(true);
    action()
      .catch(() => showToast({ message: t('friends.addSheet.errors.generic') }))
      .finally(() => setBusy(false));
  };
  const message = () =>
    openDmWith(userId, () => {
      closeMemberProfile();
      onOpenedDm();
    });
  const openServer = (id: string) => {
    closeMemberProfile();
    hideDmList();
    void localMessages
      .lastOpened(id)
      .catch(() => null)
      .then((channelId: string | null) =>
        channelId ? openChannel({ serverId: id, channelId }) : selectServer(id),
      );
    onOpenedServer();
  };

  // In a server: the top role (or Owner) · "Thành viên từ {ngày}".
  const label =
    server && roles && member && memberRightLabel(server, roles, member, null);
  const meta =
    serverId && member
      ? [
          label?.kind === 'owner'
            ? t('servers.members.owner')
            : label?.kind === 'role'
              ? label.name
              : null,
          t('servers.members.since', {
            date: sinceText(member.joined_at, timeZone),
          }),
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  const menuItems = [
    {
      label: t('profile.menu.copy'),
      icon: Copy,
      onPress: () => {
        setMenu(false);
        void Clipboard.setStringAsync(profile?.user.username ?? '').then(() =>
          showToast({ message: t('profile.menu.copied') }),
        );
      },
    },
    ...(relationship === 'friend'
      ? [
          {
            label: t('profile.menu.unfriend'),
            icon: UserMinus,
            disabled: offline,
            onPress: () => {
              setMenu(false);
              setUnfriend(true);
            },
          },
        ]
      : relationship === 'outgoing' ||
          relationship === 'incoming' ||
          relationship === 'blocked'
        ? [
            {
              label: t(
                relationship === 'outgoing'
                  ? 'profile.menu.cancelRequest'
                  : relationship === 'incoming'
                    ? 'profile.menu.decline'
                    : 'profile.menu.unblock',
              ),
              icon: relationship === 'blocked' ? Check : X,
              disabled: offline,
              onPress: () => {
                setMenu(false);
                run(() => friendActions.remove(userId));
              },
            },
          ]
        : []),
    // ponytail: "Báo cáo hồ sơ" comes with S-MOD-02, P3-A5 (#25); hidden until then.
    ...(relationship === 'blocked'
      ? []
      : [
          {
            label: t('profile.menu.block'),
            icon: Ban,
            destructive: true,
            disabled: offline,
            onPress: () => {
              setMenu(false);
              setBlocking(true);
            },
          },
        ]),
  ];

  const chip =
    v.relation?.kind === 'chip'
      ? {
          friend: { icon: UserCheck, label: t('profile.chips.friend') },
          sent: { icon: Send, label: t('profile.chips.sent') },
          blocked: { icon: Ban, label: t('profile.chips.blocked') },
        }[v.relation.chip]
      : null;
  const servers = profile?.mutual_servers ?? [];

  return (
    <>
      <BottomSheet visible={visible} onDismiss={closeMemberProfile}>
        <View style={styles.block}>
          <Avatar
            name={name}
            uri={avatarUri(profile?.user.avatar ?? null, '256')}
            deleted={deleted}
            size={96}
            ring="surface-1"
            presence={v.dot && profile ? presence.status : undefined}
          />
          <View style={styles.gap} />
          <Text variant="title-2" weight="700" accessibilityRole="header">
            {name}
          </Text>
          {!deleted && profile?.user.username && (
            <Text color="text-secondary">{profile.user.username}</Text>
          )}
          {!deleted && profile?.user.bio && (
            <Text numberOfLines={3}>{profile.user.bio}</Text>
          )}
          {!deleted && meta && (
            <Text variant="label" weight="400" color="text-tertiary">
              {meta}
            </Text>
          )}
          {!deleted && !serverId && !self && profile && (
            <View style={styles.servers}>
              {servers.length ? (
                <>
                  <Text variant="label" weight="600" color="text-tertiary">
                    {t('profile.mutual', { count: servers.length })}
                  </Text>
                  {servers.map((s) => (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      onPress={() => openServer(s.id)}
                      style={({ pressed }) => [
                        styles.serverRow,
                        pressed && {
                          backgroundColor: colors['overlay-pressed'],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.serverIcon,
                          { backgroundColor: colors['surface-3'] },
                        ]}
                      >
                        <Text variant="label" weight="600">
                          {railInitials(s.name)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.flex}>
                        {s.name}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <Text variant="label" weight="400" color="text-secondary">
                  {t('profile.noMutual')}
                </Text>
              )}
            </View>
          )}
          {v.activity && presence.activity && (
            <View style={styles.pad8}>
              <ActivityLine activity={presence.activity} form="block" />
            </View>
          )}
          {v.requestNote && (
            <View style={styles.pad8}>
              <Text variant="label" weight="400" color="text-secondary">
                {t('profile.wantsFriend', { name })}
              </Text>
            </View>
          )}
          {v.edit && (
            <View style={styles.buttons}>
              <Button
                variant="secondary"
                icon={Pencil}
                label={t('profile.edit')}
                fullWidth
                onPress={() => {
                  closeMemberProfile();
                  onEditProfile();
                }}
              />
            </View>
          )}
          {(v.message || v.relation || v.menu) && (
            <View
              style={[
                styles.buttons,
                !v.message && !v.relation?.kind && styles.apart,
              ]}
            >
              {v.message && (
                <View style={styles.flex}>
                  <Button
                    variant={
                      v.message === 'secondary' ? 'secondary' : 'primary'
                    }
                    icon={MessageCircle}
                    label={t('profile.message')}
                    disabled={v.message === 'disabled'}
                    fullWidth
                    onPress={message}
                  />
                </View>
              )}
              {v.relation?.kind === 'button' && (
                <View style={v.message ? styles.flex : undefined}>
                  <Button
                    variant={
                      v.relation.action === 'accept' ? 'primary' : 'secondary'
                    }
                    icon={v.relation.action === 'accept' ? UserCheck : UserPlus}
                    label={t(
                      v.relation.action === 'accept'
                        ? 'profile.accept'
                        : 'profile.add',
                    )}
                    fullWidth={!!v.message}
                    loading={busy}
                    disabled={offline}
                    onPress={() =>
                      run(() =>
                        v.relation?.kind === 'button' &&
                        v.relation.action === 'accept'
                          ? friendActions.accept(userId)
                          : friendActions.send(
                              { user_id: userId },
                              randomUUID(),
                            ),
                      )
                    }
                  />
                </View>
              )}
              {chip && <ChipStatus icon={chip.icon} label={chip.label} />}
              {v.menu && (
                <View style={!v.message && chip ? styles.end : undefined}>
                  <IconButton
                    icon={Ellipsis}
                    label={t('profile.more')}
                    color="text-primary"
                    onPress={() => setMenu(true)}
                  />
                </View>
              )}
            </View>
          )}
          {v.note && (
            <View style={styles.note}>
              <Icon as={Lock} size="xs" color="text-secondary" />
              <Text variant="label" weight="400" color="text-secondary">
                {CANNOT_MESSAGE_TEXT}
              </Text>
            </View>
          )}
        </View>
      </BottomSheet>
      <ActionSheet
        visible={menu}
        title={name}
        cancel={false}
        onDismiss={() => setMenu(false)}
        groups={[{ items: menuItems }]}
      />
      <Dialog
        visible={unfriend}
        title={t('friends.unfriend.title', { name })}
        body={t('friends.unfriend.body', { name })}
        row
        cancel={{
          label: t('friends.unfriend.keep'),
          onPress: () => setUnfriend(false),
        }}
        confirm={{
          label: t('friends.unfriend.confirm'),
          variant: 'danger',
          loading: busy,
          onPress: () => {
            run(() => friendActions.remove(userId));
            setUnfriend(false);
          },
        }}
        onDismiss={() => setUnfriend(false)}
      />
      <BlockDialog
        user={blocking ? { id: userId, name } : null}
        onDismiss={() => setBlocking(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  block: {
    gap: space[1],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  gap: { height: space[2] },
  pad8: { paddingTop: space[2] },
  servers: { paddingTop: space[2], gap: space[1] },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // frame S-HOME-10 `outside-server`
    height: 48,
    borderRadius: radius.input,
  },
  serverIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.server,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // frame S-HOME-10 button row
    paddingTop: space[3] - space[1],
  },
  apart: { justifyContent: 'space-between' },
  end: { marginLeft: 'auto' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // frame S-HOME-10 `cannot-message`
    paddingTop: space[2],
  },
});
