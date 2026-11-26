import type { UpdateMemberVoiceRequest } from '@nezfocus/shared';
import { Mic, MicOff, PhoneOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { moderateVoice } from '../../../data/voice';
import { homeStore } from '../../../domain/servers/homeStore';
import { toPermissionServer } from '../../../domain/servers/serverAccess';
import { moderatorVoiceRows } from '../../../domain/voice/moderation';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { space } from '../../../shared/theme';
import { ActionRow } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useMembers } from '../../servers/hooks/useMembers';
import { useServerAccess } from '../../servers/hooks/useServerAccess';

// 02 S-HOME-10 `moderator-voice` (REQ-VC-04): "Tắt mic" / "Bật lại mic" and "Ngắt khỏi phòng",
// at once, no question. The rows follow VOICE_STATE_UPDATE (mod_muted, the seat leaving).
export function ModeratorVoice({
  serverId,
  userId,
}: {
  serverId: string;
  userId: string;
}) {
  const { t } = useTranslation();
  const access = useServerAccess(serverId);
  const seat = useStore(voiceStore, (s) => s.seats[userId]);
  const channel = useStore(homeStore, (s) =>
    seat
      ? s.channels[serverId]?.find((c) => c.id === seat.channel_id)
      : undefined,
  );
  const them = useMembers(serverId).data?.find((m) => m.user.id === userId);
  const [busy, setBusy] = useState(false);
  if (!access?.roles || !access.userId || !seat || !channel || !them)
    return null;
  const rows = moderatorVoiceRows({
    server: toPermissionServer(access.server, access.roles),
    me: { userId: access.userId, roleIds: access.roleIds },
    them: { userId, roleIds: them.role_ids },
    seat,
    roomPerms: access.channelPerms(channel),
  });
  if (!rows.mute && !rows.disconnect) return null;

  const act = (body: UpdateMemberVoiceRequest) => {
    setBusy(true);
    moderateVoice(serverId, userId, body)
      .catch(() => showToast({ message: t('friends.addSheet.errors.generic') }))
      .finally(() => setBusy(false));
  };
  return (
    <View style={styles.group}>
      <Text
        variant="label"
        weight="600"
        color="text-tertiary"
        style={styles.title}
      >
        {t('voice.moderation.title')}
      </Text>
      {rows.mute && (
        <ActionRow
          item={{
            label: t(
              rows.mute === 'mute'
                ? 'voice.moderation.mute'
                : 'voice.moderation.unmute',
            ),
            icon: rows.mute === 'mute' ? MicOff : Mic,
            disabled: busy,
            onPress: () => act({ mute: rows.mute === 'mute' }),
          }}
        />
      )}
      {rows.disconnect && (
        <ActionRow
          item={{
            label: t('voice.moderation.disconnect'),
            icon: PhoneOff,
            disabled: busy,
            onPress: () => act({ disconnect: true }),
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', marginTop: space[3] },
  title: { paddingHorizontal: space[3], paddingBottom: space[1] },
});
