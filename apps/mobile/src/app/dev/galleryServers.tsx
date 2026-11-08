import type { ServerSummary } from '@nezfocus/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ChannelRow } from '../../features/servers/components/ChannelRow';
import { ServerRail } from '../../features/servers/components/ServerRail';
import { Caption, Section, Stack } from './kit';

// Board C-05 · ChannelRow and the C-26 part of board `C-10 · … · Chat` (02 › Dữ liệu mẫu).
const server = (id: string, name: string): ServerSummary => ({
  id,
  name,
  icon_url: null,
  owner_id: '1',
  template: 'study_server',
  system_channel_id: null,
  member_count: 24,
  created_at: '2026-10-01T01:00:00.000Z',
});
const SERVERS = [
  server('100', 'Ôn thi Giải tích 2'),
  server('200', 'Nhóm đồ án Mobile'),
  server('300', 'CLB Guitar PTIT'),
];
const noop = () => {};

function Rows() {
  const text = { type: 'text', focus_control: 'off' } as const;
  return (
    <View style={{ width: 262 }}>
      <Caption>text · default / selected / unread / mention</Caption>
      <ChannelRow channel={{ ...text, name: 'thong-bao' }} onPress={noop} />
      <ChannelRow
        channel={{ ...text, name: 'hoi-dap' }}
        selected
        onPress={noop}
      />
      <ChannelRow
        channel={{ ...text, name: 'tai-lieu' }}
        unread
        onPress={noop}
      />
      <ChannelRow
        channel={{ ...text, name: 'viec-nhom' }}
        mentions={1}
        onPress={noop}
      />
      <Caption>voice · study-room · tên dài</Caption>
      <ChannelRow
        channel={{
          type: 'voice',
          name: 'Phòng thoại chung',
          focus_control: 'off',
        }}
        onPress={noop}
      />
      <ChannelRow
        channel={{
          type: 'voice',
          name: 'Phòng học im lặng',
          focus_control: 'everyone',
        }}
        onPress={noop}
      />
      <ChannelRow
        channel={{
          ...text,
          name: 'thao-luan-de-cuong-on-tap-giai-tich-2-cuoi-ky',
        }}
        onPress={noop}
      />
    </View>
  );
}

function Rail() {
  const [selected, setSelected] = useState('100');
  return (
    <View style={{ height: 360 }}>
      <ServerRail
        servers={SERVERS}
        selectedId={selected}
        onSelect={setSelected}
        onDirectMessages={noop}
        onAdd={noop}
      />
    </View>
  );
}

export function ServerSections() {
  return (
    <>
      <Section title="C-05 · ChannelRow">
        <Rows />
      </Section>
      <Section title="C-26 · ServerRail">
        <Stack>
          <Caption>dm · server (chạm để chọn) · add</Caption>
          <Rail />
        </Stack>
      </Section>
    </>
  );
}
