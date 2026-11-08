import { Bell, LogIn, Mail, Plus, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  space,
  typography,
  useTheme,
  useThemePreference,
  type ThemePreference,
  type TypeVariant,
} from '../../shared/theme';
import { Button, IconButton } from '../../shared/ui/Button';
import { ScreenHeader } from '../../shared/ui/ScreenHeader';
import { Text } from '../../shared/ui/Text';
import { SearchField, TextField } from '../../shared/ui/TextField';
import { FocusSections } from './galleryFocus';
import { FormSections } from './galleryForms';
import { PeopleSections } from './galleryPeople';
import { ServerSections } from './galleryServers';
import { Caption, Row, Section, Stack } from './kit';

// Dev-only board mirror (P0-3b): one section per C-NN board, sample data from docs/design/screens/README.md.

const preferences: ThemePreference[] = ['system', 'light', 'dark'];

function ThemeSwitch() {
  const { preference, setPreference } = useThemePreference();
  return (
    <Row>
      {preferences.map((p) => (
        <Button
          key={p}
          label={p}
          size="S"
          variant={p === preference ? 'primary' : 'secondary'}
          onPress={() => setPreference(p)}
        />
      ))}
    </Row>
  );
}

function TypeScale() {
  return (
    <>
      {(Object.keys(typography) as TypeVariant[]).map((v) => (
        <Text key={v} variant={v}>
          {v.startsWith('timer') || v === 'stat' || v === 'numeric-inline'
            ? '87:12'
            : `${v} · Ẩ Ữ Ộ Ỗ Ặ`}
        </Text>
      ))}
      {(['400', '500', '600', '700', '800'] as const).map((w) => (
        <Text key={w} weight={w}>
          {w} · Ôn thi Giải tích 2 · Ẩ Ữ Ỗ Ặ Ằ Ẵ
        </Text>
      ))}
    </>
  );
}

function Buttons() {
  const [busy, setBusy] = useState(false);
  const variants = ['primary', 'secondary', 'text', 'danger'] as const;
  return (
    <>
      {variants.map((v) => (
        <Stack key={v}>
          <Caption>{`${v} · default / disabled / loading`}</Caption>
          <Row>
            <Button variant={v} label="Bắt đầu" />
            <Button variant={v} label="Bắt đầu" disabled />
            <Button variant={v} label="Bắt đầu" loading />
          </Row>
        </Stack>
      ))}
      <Caption>Kích cỡ L 48 · M 44 · S 40, kèm icon</Caption>
      <Row>
        <Button size="L" label="Vào" icon={LogIn} />
        <Button size="M" label="Vào" />
        <Button size="S" variant="secondary" label="Vào" />
      </Row>
      <Caption>L full width · nhấn để thử loading</Caption>
      <Button
        size="L"
        fullWidth
        label="Tạo Study Server"
        loading={busy}
        onPress={() => {
          setBusy(true);
          setTimeout(() => setBusy(false), 1500);
        }}
      />
      <Caption>IconButton · default / disabled</Caption>
      <Row>
        <IconButton icon={Settings} label="Cài đặt" />
        <IconButton icon={Bell} label="Thông báo" disabled />
      </Row>
    </>
  );
}

function Fields() {
  const [email, setEmail] = useState('an.nguyen@gmail.com');
  const [query, setQuery] = useState('');
  const [task, setTask] = useState('Nộp báo cáo giữa kỳ');
  return (
    <>
      <TextField
        label="Email"
        placeholder="an.nguyen@gmail.com"
        icon={Mail}
        keyboardType="email-address"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextField label="Email" value="an.nguyen@" error="Email không hợp lệ" />
      <TextField
        label="Tên hiển thị"
        value="An Nguyễn"
        helper="Tên này hiện với mọi người trong server"
      />
      <TextField
        label="Tên đăng nhập"
        value="an.nguyen"
        disabled
        helper="Không đổi được tên đăng nhập"
      />
      <TextField label="Email" value="an.nguyen@gmail.com" readonly />
      <TextField label="Mật khẩu" value="Ontap2026!" password />
      <TextField
        label="Tên việc"
        value={task}
        onChangeText={setTask}
        counterMax={200}
      />
      <TextField
        label="Mô tả"
        multiline
        placeholder="Ghi chú cho cả nhóm"
        counterMax={2000}
      />
      <Caption>SearchField · trống / có chữ</Caption>
      <SearchField
        placeholder="Tìm thành viên, kênh…"
        value={query}
        onChangeText={setQuery}
      />
      <SearchField value="Giải tích" onChangeText={() => {}} />
    </>
  );
}

function Headers() {
  const noop = () => {};
  return (
    <>
      <ScreenHeader title="Thống kê" onBack={noop} />
      <ScreenHeader
        title="Đang học lúc này"
        onBack={noop}
        action={<IconButton icon={Plus} label="Thêm" />}
      />
      <ScreenHeader
        title="Học một mình"
        onBack={noop}
        action={<Button variant="text" label="Lưu" />}
      />
      <ScreenHeader
        title="Cài đặt thông báo của server Ôn thi Giải tích 2"
        onBack={noop}
      />
      <ScreenHeader title="Việc của tôi" />
    </>
  );
}

export function UiGallery() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: insets.bottom + space[6] },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="Theme">
        <ThemeSwitch />
      </Section>
      <Section title="Typography">
        <TypeScale />
      </Section>
      <Section title="C-01 · Button">
        <Buttons />
      </Section>
      <Section title="C-02 · TextField, SearchField">
        <Fields />
      </Section>
      <Section title="C-22 · ScreenHeader">
        <Headers />
      </Section>
      <FormSections />
      <PeopleSections />
      <ServerSections />
      <FocusSections />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[3], gap: space[4] },
});
