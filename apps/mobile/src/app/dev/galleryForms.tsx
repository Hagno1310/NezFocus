import { checkPassword } from '@nezfocus/shared';
import {
  CircleCheck,
  Clock3,
  Copy,
  Flag,
  Mail,
  OctagonX,
  Pencil,
  Pin,
  Reply,
  Trash2,
  Video,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { Checkbox } from '../../shared/ui/Checkbox';
import { CodeInput } from '../../shared/ui/CodeInput';
import {
  Banner,
  EmptyState,
  Skeleton,
  SystemBanner,
} from '../../shared/ui/Feedback';
import { FormMessage } from '../../shared/ui/FormMessage';
import { ActionSheet, BottomSheet, Dialog } from '../../shared/ui/Overlay';
import { PasswordRules } from '../../shared/ui/PasswordRules';
import {
  SegmentedControl,
  TriState,
  type TriValue,
} from '../../shared/ui/SegmentedControl';
import { Text } from '../../shared/ui/Text';
import { TextField } from '../../shared/ui/TextField';
import { showToast } from '../../shared/ui/Toast';
import { Caption, Row, Section, Stack } from './kit';

type Open =
  null | 'row' | 'column' | 'single' | 'busy' | 'error' | 'sheet' | 'actions';

function Overlays() {
  const [open, setOpen] = useState<Open>(null);
  const [status, setStatus] = useState('todo');
  const close = () => setOpen(null);
  return (
    <>
      <Row>
        <Button
          size="S"
          variant="secondary"
          label="Dialog ngang"
          onPress={() => setOpen('row')}
        />
        <Button
          size="S"
          variant="secondary"
          label="Dialog dọc"
          onPress={() => setOpen('column')}
        />
        <Button
          size="S"
          variant="secondary"
          label="Một nút"
          onPress={() => setOpen('single')}
        />
        <Button
          size="S"
          variant="secondary"
          label="loading"
          onPress={() => setOpen('busy')}
        />
        <Button
          size="S"
          variant="secondary"
          label="error"
          onPress={() => setOpen('error')}
        />
        <Button
          size="S"
          variant="secondary"
          label="BottomSheet"
          onPress={() => setOpen('sheet')}
        />
        <Button
          size="S"
          variant="secondary"
          label="ActionSheet"
          onPress={() => setOpen('actions')}
        />
      </Row>
      <Dialog
        visible={open === 'row'}
        title="Vào phòng sẽ kết thúc phiên học một mình của bạn"
        body="25 phút đã học vẫn được tính."
        cancel={{ label: 'Hủy', onPress: close }}
        confirm={{ label: 'Vào phòng', onPress: close }}
        onDismiss={close}
      />
      <Dialog
        visible={open === 'column'}
        title="Dừng phiên học cho cả phòng (9 người)?"
        body="Mọi người giữ số phút đã học."
        cancel={{ label: 'Để sau', onPress: close }}
        confirm={{
          label: 'Dừng phiên cho cả phòng',
          variant: 'danger',
          onPress: close,
        }}
        onDismiss={close}
      />
      <Dialog
        visible={open === 'single'}
        title="Bạn đã bị mời ra khỏi Nhóm đồ án Mobile"
        confirm={{ label: 'Đã hiểu', onPress: close }}
        onDismiss={close}
      />
      <Dialog
        visible={open === 'busy'}
        title="Dừng phiên học cho cả phòng (9 người)?"
        cancel={{ label: 'Hủy', onPress: close }}
        confirm={{
          label: 'Dừng phiên',
          variant: 'danger',
          loading: true,
          onPress: close,
        }}
        onDismiss={close}
      />
      <Dialog
        visible={open === 'error'}
        title="Dừng phiên học cho cả phòng (9 người)?"
        error="Không kết nối được · kiểm tra mạng rồi thử lại"
        cancel={{ label: 'Hủy', onPress: close }}
        confirm={{ label: 'Dừng phiên', variant: 'danger', onPress: close }}
        onDismiss={close}
      />
      <BottomSheet
        visible={open === 'sheet'}
        title="Báo cáo tin nhắn"
        action={{ label: 'Gửi báo cáo', onPress: close }}
        onDismiss={close}
      >
        <TextField label="Mô tả (không bắt buộc)" multiline counterMax={500} />
      </BottomSheet>
      <ActionSheet
        visible={open === 'actions'}
        title="Nộp báo cáo giữa kỳ"
        subtitle="Tạo bởi Bình (binh.tran) · 3/10 lượt"
        groups={[
          {
            items: [
              { label: 'Trả lời', icon: Reply, onPress: close },
              { label: 'Sửa', icon: Pencil, onPress: close },
              { label: 'Sao chép', icon: Copy, onPress: close },
              { label: 'Ghim', icon: Pin, onPress: close },
            ],
          },
          {
            title: 'TRẠNG THÁI',
            items: ['todo', 'doing', 'done'].map((s) => ({
              label: { todo: 'Cần làm', doing: 'Đang làm', done: 'Xong' }[s]!,
              icon: CircleCheck,
              selected: status === s,
              onPress: () => setStatus(s),
            })),
          },
          {
            items: [
              {
                label: 'Báo cáo',
                icon: Flag,
                onPress: close,
                destructive: true,
              },
              { label: 'Xóa', icon: Trash2, onPress: close, destructive: true },
            ],
          },
        ]}
        onDismiss={close}
      />
    </>
  );
}

function Feedback() {
  return (
    <>
      <Caption>Banner · 4 biến thể hệ thống + có icon</Caption>
      <View style={styles.bleed}>
        <SystemBanner kind="offline" />
        <SystemBanner kind="reconnecting" />
        <SystemBanner kind="mic-denied" onOpenSettings={() => {}} />
        <SystemBanner kind="push-denied" onOpenSettings={() => {}} />
        <Banner
          icon={Mail}
          text="Lời mời vào Ôn thi Giải tích 2 đang chờ bạn · đăng nhập để tham gia"
        />
      </View>
      <Caption>Toast · không / có hành động, lỗi</Caption>
      <Row>
        <Button
          size="S"
          variant="secondary"
          label="Đã sao chép"
          onPress={() => showToast({ message: 'Đã sao chép', icon: Copy })}
        />
        <Button
          size="S"
          variant="secondary"
          label="Gửi thất bại"
          onPress={() =>
            showToast({
              message: 'Không gửi được tin nhắn',
              icon: OctagonX,
              action: { label: 'Thử lại', onPress: () => {} },
            })
          }
        />
        <Button
          size="S"
          variant="secondary"
          label="Không icon"
          onPress={() =>
            showToast({ message: 'Bạn đang được tính giờ từ 20:12' })
          }
        />
      </Row>
      <Caption>EmptyState · mascot + hành động / inline</Caption>
      <EmptyState
        mascot
        title="Chưa có việc nào"
        body="Thêm việc đầu tiên để cả nhóm cùng theo dõi."
        action={{ label: 'Thêm việc đầu tiên' }}
      />
      <EmptyState title="Chưa có phòng nào đang học" />
      <Caption>Skeleton · hàng kênh / hàng việc / tin nhắn</Caption>
      <Stack>
        <Row>
          <Skeleton width={20} height={20} />
          <Skeleton width="60%" height={16} />
        </Row>
        <Row>
          <Skeleton width={22} height={22} />
          <Stack>
            <Skeleton width={220} height={16} />
            <Skeleton width={120} height={12} />
          </Stack>
        </Row>
        <Row>
          <Skeleton width={40} height={40} round />
          <Stack>
            <Skeleton width={100} height={14} />
            <Skeleton width={260} height={16} />
            <Skeleton width={180} height={16} />
          </Stack>
        </Row>
      </Stack>
    </>
  );
}

function Segments() {
  const [view, setView] = useState<'ring' | 'grid'>('ring');
  const [pane, setPane] = useState<'members' | 'tasks' | 'pins'>('members');
  const [friends, setFriends] = useState<
    'online' | 'all' | 'pending' | 'blocked'
  >('online');
  const [perm, setPerm] = useState<TriValue>('default');
  return (
    <>
      <SegmentedControl
        segments={[
          { key: 'ring', label: 'Vòng' },
          { key: 'grid', label: 'Lưới', icon: Video, count: 3 },
        ]}
        value={view}
        onChange={setView}
      />
      <SegmentedControl
        segments={[
          { key: 'members', label: 'Thành viên' },
          { key: 'tasks', label: 'Task Board' },
          { key: 'pins', label: 'Ghim', disabled: true },
        ]}
        value={pane}
        onChange={setPane}
      />
      <SegmentedControl
        segments={[
          { key: 'online', label: 'Trực tuyến' },
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Đang chờ', count: 1 },
          { key: 'blocked', label: 'Đã chặn' },
        ]}
        value={friends}
        onChange={setFriends}
      />
      <Caption>TriState · thường / disabled / allow-disabled</Caption>
      <Row>
        <TriState label="Gửi tin nhắn" value={perm} onChange={setPerm} />
        <TriState
          label="Gửi tin nhắn"
          value="deny"
          onChange={() => {}}
          disabled
        />
        <TriState
          label="Gửi tin nhắn"
          value="default"
          onChange={() => {}}
          allowDisabled
        />
      </Row>
    </>
  );
}

function Checkboxes() {
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  return (
    <>
      <Checkbox
        checked={age}
        onChange={setAge}
        label="Tôi đủ 18 tuổi trở lên"
      />
      <Checkbox
        checked={terms}
        onChange={setTerms}
        label="Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư"
      >
        <Text>
          Tôi đồng ý với{' '}
          <Text
            color="primary"
            onPress={() => showToast({ message: 'Mở Điều khoản sử dụng' })}
          >
            Điều khoản sử dụng
          </Text>
          {'\n'}và{' '}
          <Text
            color="primary"
            onPress={() =>
              showToast({ message: 'Mở Chính sách quyền riêng tư' })
            }
          >
            Chính sách quyền riêng tư
          </Text>
        </Text>
      </Checkbox>
      <Checkbox checked label="Xóa cả tin bị báo cáo" />
      <Checkbox
        checked={false}
        label="Tôi đủ 18 tuổi trở lên"
        error="Bạn cần xác nhận để tiếp tục"
      />
      <Checkbox checked={false} label="Chọn nhiều người" disabled />
      <Checkbox checked locked label="Admin" description="Luôn thấy kênh" />
    </>
  );
}

function Codes() {
  const [code, setCode] = useState('482');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  return (
    <>
      <Caption>Tương tác · 6 số thì verifying 1 giây rồi báo lỗi</Caption>
      <CodeInput
        value={code}
        autoFocus={false}
        error={error}
        verifying={verifying}
        onChange={(c) => {
          setCode(c);
          setError(false);
        }}
        onComplete={() => {
          setVerifying(true);
          setTimeout(() => {
            setVerifying(false);
            setError(true);
          }, 1000);
        }}
      />
      {verifying && (
        <FormMessage tone="info" icon={Clock3} text="Đang kiểm tra…" />
      )}
      {error && (
        <FormMessage tone="error" text="Mã OTP không đúng. Còn 4 lần thử." />
      )}
      <Caption>verifying · error · disabled</Caption>
      <CodeInput
        value="482913"
        onChange={() => {}}
        verifying
        autoFocus={false}
      />
      <CodeInput value="482913" onChange={() => {}} error autoFocus={false} />
      <CodeInput value="" onChange={() => {}} disabled autoFocus={false} />
    </>
  );
}

function Passwords() {
  const [pw, setPw] = useState('ontap2026');
  const [submitted, setSubmitted] = useState(false);
  const issues = checkPassword(pw, {
    email: 'an.nguyen@gmail.com',
    username: 'an.nguyen',
  });
  const sameAsPersonal = issues.includes('SAME_AS_PERSONAL_INFO');
  return (
    <>
      <TextField
        label="Mật khẩu"
        password
        value={pw}
        onChangeText={setPw}
        error={
          submitted && sameAsPersonal
            ? 'Mật khẩu không được trùng email hoặc tên đăng nhập'
            : null
        }
      />
      <PasswordRules issues={issues} submitted={submitted} />
      <FormMessage tone="error" text="Email hoặc mật khẩu không đúng" />
      <FormMessage
        tone="info"
        text="Bạn đang offline. Kết nối mạng để tiếp tục."
      />
      <Button
        size="L"
        fullWidth
        label="Vào NezFocus"
        onPress={() => setSubmitted(true)}
      />
    </>
  );
}

export function FormSections() {
  return (
    <>
      <Section title="C-09 · BottomSheet, ActionSheet, Dialog">
        <Overlays />
      </Section>
      <Section title="C-14 · EmptyState, Skeleton, Toast, Banner">
        <Feedback />
      </Section>
      <Section title="C-20 · SegmentedControl">
        <Segments />
      </Section>
      <Section title="C-23 · Checkbox">
        <Checkboxes />
      </Section>
      <Section title="C-24 · CodeInput">
        <Codes />
      </Section>
      <Section title="FormMessage · PasswordRules">
        <Passwords />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space[3], gap: space[1] },
});
