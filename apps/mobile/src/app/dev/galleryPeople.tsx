import { Clock3, Languages } from 'lucide-react-native';
import { View } from 'react-native';
import {
  Avatar,
  AvatarStack,
  Badge,
  PresenceDot,
  type AvatarSize,
} from '../../shared/ui/People';
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

export function PeopleSections() {
  return (
    <>
      <Section title="C-13 · Avatar, PresenceDot, Badge">
        <People />
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
