import { Clock3, Languages } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Avatar,
  AvatarStack,
  Badge,
  PresenceDot,
  type AvatarSize,
} from '../../shared/ui/People';
import type { StudyActivity } from '@nezfocus/shared';
import { ActivityLine } from '../../shared/ui/ActivityLine';
import { Button } from '../../shared/ui/Button';
import { Text } from '../../shared/ui/Text';
import { useStore } from 'zustand';
import { presenceStore } from '../../domain/presence/presence';
import { useMyStatus } from '../../features/presence/hooks/usePresence';
import { SettingsRow } from '../../shared/ui/SettingsRow';
import { Caption, Row, Section } from './kit';

const sizes: AvatarSize[] = [20, 24, 32, 40, 56, 96];
const team = [
  { name: 'An' },
  { name: 'Bình' },
  { name: 'Chi' },
  { name: 'Dũng' },
  { name: 'Em' },
];
// Sample photo, as the spec's video tiles use stock portraits.
const photo =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=192&h=192&fit=crop';

function People() {
  return (
    <>
      <Caption>Avatar · 6 cỡ · chữ cái / mình / ảnh / deleted</Caption>
      <Row>
        {sizes.map((s) => (
          <Avatar key={s} name="Bình Trần" size={s} />
        ))}
      </Row>
      <Row>
        {sizes.map((s) => (
          <Avatar key={s} name="An Nguyễn" size={s} self />
        ))}
      </Row>
      <Row>
        {sizes.map((s) => (
          <Avatar key={s} name="Chi" uri={photo} size={s} />
        ))}
      </Row>
      <Row>
        {sizes.map((s) => (
          <Avatar key={s} name="" size={s} deleted />
        ))}
      </Row>
      <Caption>PresenceDot · Online / Idle / DND / Offline · 10 và 14</Caption>
      <Row>
        {(['online', 'idle', 'dnd', 'offline'] as const).map((p) => (
          <PresenceDot key={p} status={p} />
        ))}
        {(['online', 'idle', 'dnd', 'offline'] as const).map((p) => (
          <PresenceDot key={`${p}14`} status={p} size="lg" />
        ))}
      </Row>
      <Row>
        {(['online', 'idle', 'dnd', 'offline'] as const).map((p) => (
          <Avatar key={p} name="Dũng" size={40} presence={p} />
        ))}
        <Avatar name="Dũng" size={96} presence="idle" />
      </Row>
      <Caption>Chồng avatar · tối đa 3 rồi +N</Caption>
      <Row>
        <AvatarStack people={team.slice(0, 2)} />
        <AvatarStack people={team} />
      </Row>
      <Caption>Badge · 1 / 12 / 99+ · neutral · dot</Caption>
      <Row>
        <Badge count={1} />
        <Badge count={12} />
        <Badge count={120} />
        <Badge count={2} tone="neutral" />
        <Badge count={120} tone="neutral" />
        <Badge count="dot" />
      </Row>
    </>
  );
}

function Settings() {
  const [sound, setSound] = useState(true);
  const [activity, setActivity] = useState(false);
  return (
    <View>
      <SettingsRow
        label="Múi giờ"
        icon={Clock3}
        value="GMT+7 · Hồ Chí Minh"
        onPress={() => {}}
      />
      <SettingsRow
        label="Kênh"
        value="#viec-nhom · Nhóm đồ án Mobile"
        onPress={() => {}}
      />
      <SettingsRow
        label="Ngôn ngữ"
        icon={Languages}
        value="Tiếng Việt"
        description="Áp dụng cả khi offline"
        onPress={() => {}}
      />
      <SettingsRow label="Quyền riêng tư" onPress={() => {}} />
      <SettingsRow
        label="Âm báo chuyển pha"
        toggle={{ value: sound, onChange: setSound }}
      />
      <SettingsRow
        label="Hiện hoạt động học"
        description="Bạn bè và người cùng server thấy bạn đang học"
        toggle={{ value: activity, onChange: setActivity }}
      />
      <SettingsRow
        label="Thông báo"
        description="Thông báo đang tắt trong cài đặt máy"
        toggle={{ value: true, onChange: () => {} }}
        disabled
      />
      <SettingsRow label="Người thực hiện" people={team} onPress={() => {}} />
      <SettingsRow
        label="Kênh"
        value="#viec-nhom"
        disabled
        description="Chỉ người tạo việc đổi được kênh"
      />
    </View>
  );
}

// C-40 board rows, at a fixed 21:47 so "còn N phút" reads as drawn.
const AT = new Date('2026-10-18T14:47:00Z');
const inMin = (m: number) => new Date(AT.getTime() + m * 60_000).toISOString();
const room = (
  phase: 'focus' | 'short_break' | 'long_break',
  minutes: number,
): StudyActivity => ({
  kind: 'group_study',
  room: {
    channel_id: '9',
    channel_name: 'Phòng học im lặng',
    phase,
    state: 'running',
    phase_ends_at: inMin(minutes),
  },
});
const ACTIVITIES: StudyActivity[] = [
  room('focus', 18),
  room('short_break', 4),
  room('long_break', 12),
  {
    kind: 'group_study',
    room: {
      channel_id: '9',
      channel_name: 'Phòng học im lặng',
      phase: 'focus',
      state: 'paused',
      phase_ends_at: null,
    },
  },
  {
    kind: 'voice',
    room: {
      channel_id: '8',
      channel_name: 'Phòng thảo luận nhóm',
      study_room: true,
    },
  },
  { kind: 'group_study', room: null },
  { kind: 'voice', room: null },
  { kind: 'solo', phase: 'focus', state: 'running', phase_ends_at: inMin(105) },
  { kind: 'solo', phase: 'short_break', state: 'waiting', phase_ends_at: null },
  { kind: 'solo', phase: 'focus', state: 'paused', phase_ends_at: null },
];
const longRoom: StudyActivity = {
  kind: 'group_study',
  room: {
    channel_id: '9',
    channel_name: 'Phòng ôn thi cuối kỳ Giải tích 2 của lớp D22',
    phase: 'focus',
    state: 'running',
    phase_ends_at: inMin(105),
  },
};

function Activities() {
  return (
    <>
      <Caption>short · DMRow, MemberRow</Caption>
      {ACTIVITIES.map((a, i) => (
        <ActivityLine key={i} activity={a} form="short" now={AT} />
      ))}
      <Caption>full · FriendRow, header DM</Caption>
      {ACTIVITIES.map((a, i) => (
        <ActivityLine key={i} activity={a} form="full" now={AT} />
      ))}
      <Caption>block · S-HOME-10</Caption>
      <ActivityLine activity={ACTIVITIES[0]!} form="block" now={AT} />
      <ActivityLine activity={ACTIVITIES[7]!} form="block" now={AT} />
      <Caption>
        Khung hẹp (DMRow 360): tên phòng cắt trước, "còn 105 phút" đủ
      </Caption>
      <View style={{ width: 180 }}>
        <ActivityLine activity={longRoom} form="full" now={AT} />
        <ActivityLine
          activity={
            { ...ACTIVITIES[7]!, phase_ends_at: inMin(105) } as StudyActivity
          }
          form="full"
          now={AT}
        />
      </View>
    </>
  );
}

// P1-B4.3 debug (dev only): what this phone receives and sends, until S-ME-02 uses the hooks.
function LivePresence() {
  const others = useStore(presenceStore, (s) => s.others);
  const [mine, setMine] = useMyStatus();
  return (
    <>
      <Caption>{`Của mình: ${mine}`}</Caption>
      <Row>
        {(['online', 'idle', 'dnd', 'invisible'] as const).map((s) => (
          <Button
            key={s}
            size="S"
            variant={s === mine ? 'primary' : 'secondary'}
            label={s}
            onPress={() => setMine(s)}
          />
        ))}
      </Row>
      <Caption>Đang nhận (READY + PRESENCE_UPDATE)</Caption>
      {Object.values(others).length === 0 && (
        <Text color="text-secondary">Không ai trực tuyến</Text>
      )}
      {Object.values(others).map((p) => (
        <View key={p.user_id} style={{ gap: 4 }}>
          <Row>
            <PresenceDot status={p.status} />
            <Text>{`user ${p.user_id} · ${p.status}`}</Text>
          </Row>
          {p.activity && <ActivityLine activity={p.activity} form="full" />}
        </View>
      ))}
    </>
  );
}

export function PeopleSections() {
  return (
    <>
      <Section title="C-13 · Avatar, PresenceDot, Badge">
        <People />
      </Section>
      <Section title="Presence (dev)">
        <LivePresence />
      </Section>
      <Section title="C-40 · ActivityLine">
        <Activities />
      </Section>
      <Section title="C-15 · SettingsRow">
        <Settings />
      </Section>
      <Section title="C-03 · TabBar">
        <Caption>
          Xem trên Main; Cá nhân › Badge mẫu bật badge 3 / chấm / 12 / 99+
        </Caption>
      </Section>
    </>
  );
}
