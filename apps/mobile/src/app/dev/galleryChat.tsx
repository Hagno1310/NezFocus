import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { composerCount } from '../../domain/messages/chatRows';
import {
  ChannelHeader,
  ChannelStart,
  DateDivider,
  JumpPill,
  MessageBubble,
} from '../../shared/ui/Chat';
import { Composer } from '../../shared/ui/Composer';
import { MessageText } from '../../shared/ui/MessageText';
import { Text } from '../../shared/ui/Text';
import { Caption, Section, Stack } from './kit';

// Boards `C-04 · ChannelHeader` and `C-10 · C-11 · …· Chat (v1.9)`, sample data of spec 02.
const noop = () => {};
// C-10 › Nội dung đặc biệt, every Markdown kind of MSG-02 in one message (#120).
const MARKDOWN = [
  '**đậm**, *nghiêng*, _nghiêng_, ~~gạch~~, `inline code`, ||đáp án 8π/3||',
  '> Đổi sang tọa độ cực rồi tính',
  'Link https://vi.wikipedia.org/wiki/Tích_phân_bội và [click](javascript:alert(1)), <b>x</b>',
  '```',
  'const I = integrate(r => r * f(r * Math.cos(t), r * Math.sin(t)), 0, 2 * Math.PI);',
  '```',
].join('\n');
const LONG = 'Cách này tính ra 8π/3 nhưng ';

function Bubbles() {
  return (
    <View style={{ marginHorizontal: -16 }}>
      <DateDivider label="Hôm nay" />
      <MessageBubble name="Bình" time="20:02" accessibilityLabel="Bình">
        <Text>Mọi người ơi, câu 3 đề giữa kỳ năm ngoái giải thế nào vậy?</Text>
      </MessageBubble>
      <MessageBubble name="Chi" time="20:04" accessibilityLabel="Chi">
        <Text>Đổi sang tọa độ cực rồi tính tích phân kép là ra nhé</Text>
      </MessageBubble>
      <MessageBubble
        name="Chi"
        time="20:04"
        head={false}
        accessibilityLabel="Chi"
      >
        <Text>Tin gộp nhóm: không avatar, tên, giờ</Text>
      </MessageBubble>
      <MessageBubble name="Bình" time="20:10" mention accessibilityLabel="Bình">
        <Text>@An tối nay 20:30 vào Phòng học im lặng ôn tiếp nhé</Text>
      </MessageBubble>
      <MessageBubble name="An" self time="20:11" accessibilityLabel="An">
        <Text>Ok, mình vào sớm giữ chỗ</Text>
      </MessageBubble>
      <MessageBubble
        name="An"
        self
        time="20:12"
        head={false}
        status={{ kind: 'failed', text: 'Không gửi được · Thử lại' }}
        accessibilityLabel="An"
      >
        <Text>Mình gửi đề cương lên #tai-lieu rồi nhé</Text>
      </MessageBubble>
      <MessageBubble
        name="An"
        self
        time="20:12"
        head={false}
        status={{ kind: 'pending', offline: true }}
        accessibilityLabel="An"
      >
        <Text>Mình vào phòng trước nhé</Text>
      </MessageBubble>
      <MessageBubble
        name="Chi"
        time="20:04"
        head={false}
        surface="surface-2"
        liftedTime="20:04"
        accessibilityLabel="Chi"
      >
        <Text>lifted: tin gộp hiện giờ của chính nó</Text>
      </MessageBubble>
      <MessageBubble
        name="Nguyễn Hoàng Bình (K22 – CNTT – Lớp trưởng D22CN05)"
        time="Hôm qua 21:05"
        accessibilityLabel="Bình"
      >
        <Text>Tên dài cắt trước, giờ luôn đủ</Text>
      </MessageBubble>
      <MessageBubble
        name="Bình"
        deleted
        time="16/10/2026 20:00"
        accessibilityLabel="Tài khoản đã bị xóa"
      >
        <Text>Tài khoản đã bị xóa</Text>
      </MessageBubble>
      <MessageBubble name="Chi" time="20:30" accessibilityLabel="Chi">
        <MessageText content={MARKDOWN} />
      </MessageBubble>
      <ChannelStart name="hoi-dap" />
    </View>
  );
}

function Composers() {
  const [text, setText] = useState('');
  const count = composerCount(text);
  return (
    <View style={{ marginHorizontal: -16, gap: 8 }}>
      <Caption>
        empty / typing (gõ thử; dán &gt; 1800 ký tự để thấy bộ đếm)
      </Caption>
      <Composer
        value={text}
        onChangeText={setText}
        placeholder="Nhắn #hoi-dap"
        counter={count.counter}
        canSend={count.canSend}
        onSend={() => setText('')}
        onAttach={noop}
        onEmoji={noop}
      />
      <Caption>char-counter · near / too-long</Caption>
      <Composer
        value={LONG}
        onChangeText={noop}
        placeholder=""
        counter={{ kind: 'left', n: 120 }}
        canSend
        onSend={noop}
        onAttach={noop}
        onEmoji={noop}
      />
      <Composer
        value={LONG}
        onChangeText={noop}
        placeholder=""
        counter={{ kind: 'over', n: 12 }}
        canSend={false}
        onSend={noop}
        onAttach={noop}
        onEmoji={noop}
      />
      <Caption>disabled</Caption>
      <Composer
        value=""
        onChangeText={noop}
        placeholder=""
        counter={null}
        canSend={false}
        onSend={noop}
        disabled={{
          icon: Lock,
          text: 'Bạn không có quyền gửi tin nhắn trong kênh này',
        }}
      />
    </View>
  );
}

export function ChatSections() {
  return (
    <>
      <Section title="C-04 · ChannelHeader">
        <View style={{ marginHorizontal: -16 }}>
          <ChannelHeader
            topInset={false}
            title="hoi-dap"
            subtitle="Ôn thi Giải tích 2"
            onMenu={noop}
            onMembers={noop}
          />
          <ChannelHeader
            topInset={false}
            title="hoi-dap-bai-tap-tich-phan-boi-chuong-4"
            subtitle="Câu lạc bộ Ôn thi Giải tích 2 – Khoa Công nghệ thông tin"
            onMenu={noop}
            onMembers={noop}
          />
        </View>
      </Section>
      <Section title="C-10 · MessageBubble">
        <Stack>
          <Bubbles />
          <Caption>JumpPill (scrolled-up)</Caption>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <JumpPill count={3} onPress={noop} />
            <JumpPill count={0} onPress={noop} />
          </View>
        </Stack>
      </Section>
      <Section title="C-11 · Composer">
        <Composers />
      </Section>
    </>
  );
}
