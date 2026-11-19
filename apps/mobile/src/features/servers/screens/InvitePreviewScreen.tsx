import { ErrorCode, type InvitePreview } from '@nezfocus/shared';
import { Volume2, X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { asApiError } from '../../../domain/auth/authFlow';
import {
  formatCount,
  type Destination,
} from '../../../domain/invites/joinInvite';
import { homeStore } from '../../../domain/servers/homeStore';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Button, IconButton } from '../../../shared/ui/Button';
import { Skeleton, SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { Mascot } from '../../../shared/ui/Mascot';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useOnline } from '../../gateway/hooks/useOnline';
import { ServerIcon } from '../components/ServerIcon';
import { useInvitePreview } from '../hooks/useInvitePreview';
import { memberArrival, useJoinInvite } from '../hooks/useJoinInvite';

const ICON = 72;

function InviteCard({ preview }: { preview: InvitePreview | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors['surface-1'], borderColor: colors.border },
      ]}
    >
      {preview ? (
        <>
          <ServerIcon server={preview.server} size={ICON} />
          <View style={styles.flex}>
            <Text variant="headline" numberOfLines={2}>
              {preview.server.name}
            </Text>
            <Text variant="label" color="text-secondary">
              {t('invites.stats', {
                members: formatCount(preview.server.member_count),
                online: formatCount(preview.server.online_count),
              })}
            </Text>
          </View>
        </>
      ) : (
        <>
          <Skeleton width={ICON} height={ICON} />
          <View style={[styles.flex, styles.skeletonLines]}>
            <Skeleton width="80%" height={20} />
            <Skeleton width="55%" height={14} />
          </View>
        </>
      )}
    </View>
  );
}

// S-MOD-01 · Preview lời mời (spec 10): loading, valid, room-invite, joining, expired,
// banned, max-servers, already-member, offline, guest (signed out, P2-A1.4).
export function InvitePreviewScreen({
  code,
  channelParam,
  guest,
  onClose,
  onArrive,
}: {
  code: string;
  channelParam?: string;
  // Signed out: the two buttons of `guest` instead of "Tham gia" (P2-A1.4).
  guest?: { onCreateAccount: () => void; onSignIn: () => void };
  onClose: () => void;
  onArrive: (serverId: string, to: Destination | null, room?: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const online = useOnline();
  const query = useInvitePreview(code);
  const preview = query.data ?? null;
  const roomName = (to: Destination | null) =>
    to?.kind === 'room' ? preview?.channel?.name : undefined;
  const join = useJoinInvite(code, channelParam, (server, to) =>
    onArrive(server.id, to, roomName(to)),
  );
  const isMember = useStore(
    homeStore,
    (s) => !!preview && !!s.servers?.some((x) => x.id === preview.server.id),
  );

  // already-member: no preview, straight to the channel + Toast (SRV-04 AC3, SRV-07 v1.6).
  const handled = useRef(false);
  useEffect(() => {
    if (!preview || !isMember || guest || handled.current) return;
    handled.current = true;
    void memberArrival(preview.server.id, channelParam).then((found) => {
      onArrive(
        preview.server.id,
        found?.to ?? null,
        found?.to.kind === 'room' ? preview.channel?.name : undefined,
      );
      showToast({
        message: t('invites.alreadyMember', { server: preview.server.name }),
      });
    });
  }, [preview, isMember, guest, channelParam, onArrive, t]);

  const lookupError = asApiError(query.error);
  const expired =
    lookupError?.code === ErrorCode.InviteInvalid || join.error === 'invalid';

  if (expired)
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.bg,
            paddingTop: top,
            paddingBottom: bottom,
          },
        ]}
      >
        <IconButton icon={X} label={t('invites.close')} onPress={onClose} />
        <View style={[styles.middle, styles.center]}>
          <Mascot mood="confused" size={96} />
          <Text variant="title-1" style={styles.centerText}>
            {t('invites.expiredTitle')}
          </Text>
          <Text color="text-secondary" style={styles.centerText}>
            {t('invites.expiredBody')}
          </Text>
        </View>
        <Button
          variant="secondary"
          size="L"
          fullWidth
          label={t('invites.close')}
          onPress={onClose}
        />
      </View>
    );

  // offline: still nothing loaded (Banner + still skeleton). A preview already loaded stays.
  const offline = !preview && !online;
  const failed = !preview && !!query.error && !offline;
  const title = preview
    ? preview.inviter
      ? t('invites.invitedBy', { name: preview.inviter.display_name })
      : t('invites.invited')
    : null;

  const footer = (() => {
    if (!preview)
      return (
        <>
          {offline && (
            <FormMessage tone="info" text={t('invites.previewOffline')} />
          )}
          {failed && (
            <FormMessage tone="error" text={t('invites.lookupFailed')} />
          )}
          {(offline || failed) && (
            <Button
              size="L"
              fullWidth
              label={failed ? t('invites.retry') : t('invites.join')}
              disabled={offline}
              onPress={() => void query.refetch()}
            />
          )}
        </>
      );
    if (guest)
      return (
        <>
          <Text
            variant="label"
            color="text-secondary"
            style={styles.centerText}
          >
            {t('invites.guestKept')}
          </Text>
          <Button
            size="L"
            fullWidth
            label={t('invites.guestCreate')}
            onPress={guest.onCreateAccount}
          />
          <Button
            variant="secondary"
            size="L"
            fullWidth
            label={t('invites.guestSignIn')}
            onPress={guest.onSignIn}
          />
        </>
      );
    if (join.error === 'banned')
      return (
        <>
          <FormMessage
            tone="error"
            text={t('invites.banned', { server: preview.server.name })}
          />
          <Button
            variant="secondary"
            size="L"
            fullWidth
            label={t('invites.close')}
            onPress={onClose}
          />
        </>
      );
    return (
      <>
        {join.error === 'max-servers' && (
          <FormMessage tone="error" text={t('invites.maxServers')} />
        )}
        {/* Chỉ ghi luật: offline after the preview loaded → neutral line, card kept. */}
        {join.error === 'network' && (
          <FormMessage tone="info" text={t('invites.joinNeedsNetwork')} />
        )}
        {join.error === 'other' && (
          <FormMessage tone="error" text={t('invites.lookupFailed')} />
        )}
        <Button
          size="L"
          fullWidth
          label={t('invites.join')}
          loading={join.joining}
          disabled={join.error === 'max-servers' || isMember}
          onPress={() => void join.join(preview)}
        />
      </>
    );
  })();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: top, paddingBottom: bottom },
      ]}
    >
      <IconButton
        icon={X}
        label={t('invites.close')}
        disabled={join.joining}
        onPress={onClose}
      />
      {offline && (
        <View style={styles.banner}>
          <SystemBanner kind="offline" />
        </View>
      )}
      <View style={styles.middle}>
        {title ? (
          <Text variant="title-1" accessibilityRole="header">
            {title}
          </Text>
        ) : (
          <Skeleton width={200} height={30} />
        )}
        <InviteCard preview={preview} />
        {preview?.channel && (
          <View style={styles.room}>
            <Icon as={Volume2} size="sm" color="text-secondary" />
            <Text variant="label" color="text-secondary" style={styles.flex}>
              {t('invites.roomLine', { room: preview.channel.name })}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: space[3] },
  banner: { marginHorizontal: -space[3] },
  middle: { flex: 1, justifyContent: 'center', gap: space[3] },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.button,
    borderWidth: size.hairline,
  },
  skeletonLines: { gap: space[2] },
  room: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  footer: { gap: space[2] + space[1], paddingTop: space[3] },
});
