import {
  DEFAULT_TIMEOUT_LEVEL,
  MODERATION_REASON_MAX,
  TIMEOUT_LEVELS,
  memberName,
  type ServerMember,
  type TimeoutLevel,
} from '@nezfocus/shared';
import {
  Ban,
  Clock3,
  LogOut,
  Shield,
  Timer,
  TimerOff,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { homeStore } from '../../../domain/servers/homeStore';
import {
  moderationErrorOf,
  moderationRows,
  timeoutEnd,
  type ModerationError,
} from '../../../domain/servers/moderation';
import { memberBlock } from '../../../domain/servers/members';
import { roleActor } from '../../../domain/servers/roles';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { space } from '../../../shared/theme';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { ActionRow, BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { useNow } from '../../study/hooks/useSolo';
import { useModerate } from '../hooks/useModeration';
import { useServerAccess } from '../hooks/useServerAccess';

type Open = 'timeout' | 'change' | 'kick' | 'ban' | null;

const TICK_MS = 15_000;
// From the moment of the tap: a 60-second timeout must not start 15 seconds short.
const endsIn = (ms: number) => new Date(Date.now() + ms).toISOString();

// S-SET-03 KIỂM DUYỆT (`member-detail`, `timed-out`, `offline`) and 02 S-HOME-10 `moderator`:
// the rows open the sheet / dialog right where they are (Q5). `onRemoved` after a kick / ban.
export function ModerationGroup({
  serverId,
  member,
  title,
  onRemoved,
  onRoles,
  above,
  bleed = false,
}: {
  serverId: string;
  member: ServerMember;
  title: (text: string) => ReactNode; // each screen draws its own group label
  onRemoved: () => void;
  onRoles?: () => void; // S-HOME-10 "Vai trò ›" (MANAGE_ROLES)
  above?: ReactNode; // S-HOME-10 `moderator-voice` rows, under the same label
  bleed?: boolean; // in a padded screen body the rows reach the edges (ActionRow pads itself)
}) {
  const { t } = useTranslation();
  const access = useServerAccess(serverId);
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const moderate = useModerate(serverId);
  const [open, setOpen] = useState<Open>(null);
  const [lifting, setLifting] = useState(false);
  const now = useNow(TICK_MS); // a timeout ending by the clock turns the rows back
  if (!access?.userId || !access.roles) return null;
  const actor = {
    ...roleActor(access.server, access.roles, access.userId, access.roleIds),
    perms: access.perms,
  };
  // `member-blocked` / S-HOME-10: nothing at all on the Owner or a role level or above.
  if (memberBlock(access.server, actor, member)) return null;
  const rows = moderationRows(actor, member, now.getTime());
  const name = memberName(member);
  const any = rows.timeout || rows.kick || rows.ban || onRoles || above;
  if (!any) return null;

  const lift = async () => {
    setLifting(true);
    try {
      await moderate.timeout(member.user.id, null);
      showToast({
        message: t('servers.moderation.lifted', { name }),
        icon: TimerOff,
      });
    } catch {
      showToast({ message: t('servers.moderation.failed') });
    } finally {
      setLifting(false);
    }
  };
  const row = (
    label: string,
    icon: typeof Timer,
    onPress: () => void,
    extra: { destructive?: boolean; chevron?: boolean } = {},
  ) => (
    <ActionRow
      item={{ label, icon, onPress, disabled: offline || lifting, ...extra }}
    />
  );
  return (
    <View style={styles.group}>
      {title(t('servers.moderation.title'))}
      <View style={bleed && styles.bleed}>
        {above}
        {rows.timeout === 'set' &&
          row(
            t('servers.moderation.timeout'),
            Timer,
            () => setOpen('timeout'),
            {
              chevron: !onRoles,
            },
          )}
        {rows.timeout === 'running' && (
          <>
            {row(
              t('servers.moderation.changeTimeout'),
              Timer,
              () => setOpen('change'),
              { chevron: true },
            )}
            {row(
              t('servers.moderation.liftTimeout'),
              TimerOff,
              () => void lift(),
            )}
          </>
        )}
        {rows.kick &&
          row(t('servers.moderation.kick'), LogOut, () => setOpen('kick'), {
            destructive: true,
          })}
        {rows.ban &&
          row(t('servers.moderation.ban'), Ban, () => setOpen('ban'), {
            destructive: true,
          })}
        {onRoles &&
          row(t('servers.moderation.roles'), Shield, onRoles, {
            chevron: true,
          })}
      </View>
      <TimeoutSheet
        serverId={serverId}
        member={member}
        mode={open === 'change' ? 'change' : 'set'}
        visible={open === 'timeout' || open === 'change'}
        onClose={() => setOpen(null)}
      />
      <RemoveDialog
        serverId={serverId}
        member={member}
        kind={open === 'ban' ? 'ban' : 'kick'}
        visible={open === 'kick' || open === 'ban'}
        onClose={() => setOpen(null)}
        onDone={onRemoved}
      />
    </View>
  );
}

const errorText = (
  t: TFunction,
  error: ModerationError | null,
  name: string,
) =>
  error === 'hierarchy'
    ? t('servers.moderation.outranked', { name })
    : error
      ? t('servers.moderation.failed')
      : null;

// `timeout-sheet`, `timeout-sheet-in-room`, `timeout-change-sheet` (REQ-ROLE-05, CR-17 #12).
function TimeoutSheet({
  serverId,
  member,
  mode,
  visible,
  onClose,
}: {
  serverId: string;
  member: ServerMember;
  mode: 'set' | 'change';
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { timeZone } = useChatClock();
  const moderate = useModerate(serverId);
  const [level, setLevel] = useState<TimeoutLevel>(DEFAULT_TIMEOUT_LEVEL);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ModerationError | null>(null);
  const room = useRoomOf(serverId, member.user.id);
  const now = useNow(TICK_MS);
  const name = memberName(member);
  const ms = TIMEOUT_LEVELS.find((l) => l.key === level)!.ms;
  const end = timeoutEnd(now.getTime(), ms, timeZone);
  const close = () => {
    setLevel(DEFAULT_TIMEOUT_LEVEL);
    setReason('');
    setError(null);
    onClose();
  };
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const until = endsIn(ms);
      await moderate.timeout(
        member.user.id,
        until,
        mode === 'set' ? reason : undefined,
      );
      if (mode === 'change')
        showToast({
          message: t('servers.moderation.changed', { name }),
          icon: Timer,
        });
      close();
    } catch (err) {
      setError(moderationErrorOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet
      visible={visible}
      title={t(
        mode === 'set'
          ? 'servers.moderation.timeoutTitle'
          : 'servers.moderation.changeTitle',
        { name },
      )}
      onDismiss={close}
      error={errorText(t, error, name)}
      action={{
        label: t(
          mode === 'set'
            ? 'servers.moderation.timeoutAction'
            : 'servers.moderation.changeAction',
        ),
        onPress: () => void submit(),
        loading: busy,
        disabled: error === 'hierarchy',
      }}
    >
      <Text color="text-secondary">
        {t('servers.moderation.timeoutBody', { name })}
      </Text>
      <View>
        {TIMEOUT_LEVELS.map((l) => (
          <RadioRow
            key={l.key}
            label={t(`servers.moderation.levels.${l.key}`)}
            selected={level === l.key}
            onPress={() => setLevel(l.key)}
          />
        ))}
      </View>
      <View style={styles.end}>
        <Icon as={Clock3} size="sm" color="text-secondary" />
        <Text variant="label" color="text-secondary">
          {end.date
            ? t('servers.moderation.endsOn', end)
            : t('servers.moderation.endsToday', end)}
        </Text>
      </View>
      {room && (
        <FormMessage
          tone="info"
          variant="field"
          text={t('servers.moderation.inRoom', { name, room })}
        />
      )}
      {mode === 'set' && (
        <TextField
          label={t('servers.moderation.reason')}
          placeholder={t('servers.moderation.reasonHint')}
          value={reason}
          onChangeText={setReason}
          counterMax={MODERATION_REASON_MAX}
          maxLength={MODERATION_REASON_MAX}
        />
      )}
    </BottomSheet>
  );
}

// `kick-confirm`, `ban-confirm`, `ban-keyboard`; `done` is the caller's (`onDone`).
function RemoveDialog({
  serverId,
  member,
  kind,
  visible,
  onClose,
  onDone,
}: {
  serverId: string;
  member: ServerMember;
  kind: 'kick' | 'ban';
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const moderate = useModerate(serverId);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<0 | 1 | 7>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ModerationError | null>(null);
  const name = memberName(member);
  const close = () => {
    setReason('');
    setDays(0);
    setError(null);
    onClose();
  };
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'kick') await moderate.kick(member.user.id, reason || null);
      else
        await moderate.ban(member.user.id, {
          reason: reason || null,
          delete_message_days: days,
        });
      close();
      showToast({
        message: t(
          kind === 'kick'
            ? 'servers.moderation.kicked'
            : 'servers.moderation.banned',
          { name },
        ),
        icon: kind === 'kick' ? LogOut : Ban,
      });
      onDone();
    } catch (err) {
      setError(moderationErrorOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      visible={visible}
      row
      title={t(
        kind === 'kick'
          ? 'servers.moderation.kickTitle'
          : 'servers.moderation.banTitle',
        { name },
      )}
      body={t(
        kind === 'kick'
          ? 'servers.moderation.kickBody'
          : 'servers.moderation.banBody',
        { name },
      )}
      error={errorText(t, error, name)}
      confirm={{
        label: t(
          kind === 'kick'
            ? 'servers.moderation.kickAction'
            : 'servers.moderation.banAction',
        ),
        variant: 'danger',
        loading: busy,
        disabled: error === 'hierarchy',
        onPress: () => void submit(),
      }}
      cancel={{ label: t('servers.moderation.cancel'), onPress: close }}
      onDismiss={close}
    >
      <TextField
        label={t('servers.moderation.reason')}
        placeholder={t('servers.moderation.reasonHint')}
        value={reason}
        onChangeText={setReason}
        counterMax={MODERATION_REASON_MAX}
        maxLength={MODERATION_REASON_MAX}
      />
      {kind === 'ban' && (
        <View>
          <Text variant="label" weight="600" color="text-secondary">
            {t('servers.moderation.deleteMessages')}
          </Text>
          {([0, 1, 7] as const).map((d) => (
            <RadioRow
              key={d}
              label={t(`servers.moderation.delete${d}`)}
              selected={days === d}
              onPress={() => setDays(d)}
            />
          ))}
        </View>
      )}
    </Dialog>
  );
}

// `timeout-sheet-in-room`: the room of this server the person sits in (voice state, B).
function useRoomOf(serverId: string, userId: string) {
  const seat = useStore(voiceStore, (s) => s.seats[userId]);
  return useStore(homeStore, (s) =>
    seat && seat.server_id === serverId
      ? (s.channels[serverId]?.find((c) => c.id === seat.channel_id)?.name ??
        null)
      : null,
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch' },
  bleed: { marginHorizontal: -space[3] },
  end: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});
