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
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useStore } from 'zustand';
import { friendActions } from '../../../data/friends';
import { localMessages } from '../../../data/messages';
import { friendsStore } from '../../../domain/friends/friends';
import {
  closeMemberProfile,
  profileSheet,
  type ProfileTarget,
} from '../../../domain/friends/profileSheet';
import {
  litPhase,
  profileBand,
  profileView,
} from '../../../domain/friends/profileView';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { dmWith, hideDmList } from '../../../domain/dm/dmStore';
import {
  homeStore,
  openChannel,
  selectServer,
} from '../../../domain/servers/homeStore';
import { railInitials } from '../../../domain/servers/drawer';
import { memberRightLabel, sinceText } from '../../../domain/servers/members';
import { sessionStore } from '../../../domain/session/sessionStore';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { ActivityLine } from '../../../shared/ui/ActivityLine';
import { Button } from '../../../shared/ui/Button';
import { ChipStatus } from '../../../shared/ui/ChipStatus';
import { phaseColor } from '../../../shared/ui/Focus';
import { Icon } from '../../../shared/ui/Icon';
import { ActionSheet, BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { showToast, ToastCard } from '../../../shared/ui/Toast';
import { avatarIn } from '../../../shared/ui/transitions';

const COPIED_MS = 4000; // C-14 toast without an action
const AVATAR_RING = 6; // frame S-HOME-10: the sheet colour cut around the 96 avatar
const PHASE_RING = 2; // chốt 25/11/2026: a phase-coloured ring inside the cut while studying
const HANDLE_AREA = 28; // BottomSheet handle row 20 + gap 8, above the content
const MORE = 36; // ⋯ on the banner; hitSlop brings the touch to 48
import { useChatClock } from '../../chat/hooks/useChatClock';
import { openDmWith } from '../../dm/openDm';
import { avatarUri } from '../../me/avatarUri';
import { usePresence } from '../../presence/hooks/usePresence';
import { useMembers } from '../../servers/hooks/useMembers';
import { useUserProfile } from '../hooks/useUserProfile';
import { BlockDialog } from './BlockDialog';
import { ModeratorVoice } from '../../voice/components/ModeratorVoice';
import { RelationIcon, type RelationIconKind } from './RelationIcon';

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
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();

  // Until the profile loads: what the friends list or the DM already knows.
  const known = useStore(
    friendsStore,
    (s) => s.byUser[userId]?.user ?? dmWith(userId)?.recipient,
  );
  const user = profile?.user ?? known;
  const self = userId === meId;
  const relationship = live ?? profile?.relationship ?? 'none';
  const deleted = !!profile?.deleted;
  const name = deleted
    ? t('dm.deleted')
    : (user?.display_name ?? user?.username ?? '');
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
  const sendRequest = () =>
    friendActions.send({ user_id: userId }, randomUUID());
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
        // Over the sheet, like S-HOME-07 `copied`: a plain Toast would sit under it.
        void Clipboard.setStringAsync(user?.username ?? '').then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), COPIED_MS);
        });
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
          blocked: { icon: Ban, label: t('profile.chips.blocked') },
        }[v.relation.chip]
      : null;
  // Chốt 25/11/2026: opened from their own DM (no "Nhắn tin"), the relation icon joins ⋯ on
  // the banner instead of standing alone in the button row; "Chấp nhận" keeps its label.
  const bannerRelation: RelationIconKind | null = v.message
    ? null
    : v.relation?.kind === 'icon'
      ? v.relation.icon
      : v.relation?.kind === 'button' && v.relation.action === 'add'
        ? 'add'
        : null;
  const servers = profile?.mutual_servers ?? [];
  const bio = profile?.user.bio ?? null;
  const showServers = !serverId && !self && !!profile;
  const phase = v.activity ? litPhase(presence.activity) : null;
  const lamp = phase ? phaseColor[phase] : null;

  return (
    <>
      <BottomSheet
        visible={visible}
        onDismiss={closeMemberProfile}
        band={{ tone: profileBand(userId, deleted), lamp }}
        bandAction={
          bannerRelation || v.menu ? (
            <View style={styles.bandRow}>
              {bannerRelation && (
                <RelationIcon
                  kind={bannerRelation}
                  onBanner
                  busy={busy}
                  disabled={offline}
                  onAdd={sendRequest}
                />
              )}
              {v.menu && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.more')}
                  hitSlop={(size.touch - MORE) / 2}
                  onPress={() => setMenu(true)}
                  style={({ pressed }) => [
                    styles.more,
                    {
                      backgroundColor: pressed
                        ? colors['surface-2']
                        : colors.scrim,
                    },
                  ]}
                >
                  <Icon as={Ellipsis} size="md" color="text-primary" />
                </Pressable>
              )}
            </View>
          ) : undefined
        }
        above={
          copied ? (
            <ToastCard
              toast={{ message: t('profile.menu.copied'), icon: Check }}
            />
          ) : undefined
        }
      >
        <View style={styles.block}>
          <Animated.View
            entering={avatarIn(reduced)}
            style={[
              styles.avatarRing,
              { backgroundColor: colors['surface-1'] },
              lamp && styles.avatarRingLit,
            ]}
          >
            <View
              style={
                lamp ? [styles.phaseRing, { borderColor: colors[lamp] }] : null
              }
            >
              <Avatar
                name={name}
                uri={avatarUri(user?.avatar ?? null, '256')}
                deleted={deleted}
                size={96}
                ring="surface-1"
                presence={v.dot && user ? presence.status : undefined}
              />
            </View>
          </Animated.View>
          <View style={styles.gap} />
          <Text variant="title-2" weight="700" accessibilityRole="header">
            {name}
          </Text>
          {!deleted && user?.username && (
            <Text color="text-secondary">{user.username}</Text>
          )}
          {/* Discord-like: one surface-2 block for what describes them (25/11/2026). */}
          {!deleted && (bio || meta || showServers) && (
            <View
              style={[styles.info, { backgroundColor: colors['surface-2'] }]}
            >
              {bio && (
                <View style={styles.section}>
                  <Text variant="label" weight="600" color="text-tertiary">
                    {t('profile.about')}
                  </Text>
                  <Text numberOfLines={3}>{bio}</Text>
                </View>
              )}
              {meta && (
                <View style={styles.section}>
                  <Text variant="label" weight="600" color="text-tertiary">
                    {t('profile.inServer')}
                  </Text>
                  <Text variant="label" weight="400" color="text-secondary">
                    {meta}
                  </Text>
                </View>
              )}
              {showServers && (
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
          {(v.message || (v.relation && !bannerRelation)) && (
            <View style={styles.buttons}>
              {v.message && (
                <View
                  style={
                    v.relation?.kind === 'chip' ? styles.main : styles.flex
                  }
                >
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
              {v.relation?.kind === 'button' && !bannerRelation && (
                <View style={styles.flex}>
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
                    fullWidth
                    loading={busy}
                    disabled={offline}
                    onPress={() =>
                      run(() =>
                        v.relation?.kind === 'button' &&
                        v.relation.action === 'accept'
                          ? friendActions.accept(userId)
                          : sendRequest(),
                      )
                    }
                  />
                </View>
              )}
              {v.relation?.kind === 'icon' && !bannerRelation && (
                <RelationIcon kind={v.relation.icon} />
              )}
              {chip && (
                <View style={styles.chip}>
                  <ChipStatus icon={chip.icon} label={chip.label} />
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
          {/* P3-B1.6 (#142): the voice rows of "Kiểm duyệt"; P3-A3.1 (#126) adds its rows here. */}
          {serverId && !self && (
            <ModeratorVoice serverId={serverId} userId={userId} />
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
  // The button keeps its label whole; a ChipStatus beside it shrinks instead.
  main: { flexGrow: 1, flexShrink: 0 },
  // Frame S-HOME-10: the avatar's centre on the banner's bottom edge (C-41).
  block: {
    gap: space[1],
    paddingTop: size.profileBand - 96 / 2 - AVATAR_RING - HANDLE_AREA,
    paddingHorizontal: space[2], // + the sheet's 16 = frame S-HOME-10's 24
    paddingBottom: space[2],
  },
  avatarRing: {
    alignSelf: 'flex-start',
    padding: AVATAR_RING,
    marginLeft: -AVATAR_RING,
    borderRadius: radius.full,
  },
  avatarRingLit: { padding: AVATAR_RING - PHASE_RING * 2 },
  phaseRing: {
    borderWidth: PHASE_RING,
    padding: PHASE_RING,
    borderRadius: radius.full,
  },
  bandRow: { flexDirection: 'row', gap: space[2] },
  more: {
    width: MORE,
    height: MORE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: space[1] / 2 },
  gap: { height: space[2] },
  pad8: { paddingTop: space[2] },
  info: {
    marginTop: space[2],
    padding: space[2] + space[1],
    gap: space[2],
    borderRadius: radius.button,
  },
  servers: { gap: space[1] },
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
  // stretch: a label wrapping at large text grows both buttons, never just one.
  buttons: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12, // frame S-HOME-10 button row
    paddingTop: space[3] - space[1],
  },
  chip: { flexShrink: 1, minWidth: 0, justifyContent: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // frame S-HOME-10 `cannot-message`
    paddingTop: space[2],
  },
});
