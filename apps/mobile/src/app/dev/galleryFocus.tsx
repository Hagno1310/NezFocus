import type { FocusPhase } from '@nezfocus/shared';
import {
  Coffee,
  LampDesk,
  Pause,
  Play,
  SkipForward,
  Square,
} from 'lucide-react-native';
import { Button, IconButton } from '../../shared/ui/Button';
import {
  FocusTimer,
  MiniPlayer,
  PhaseBadge,
  RoomControl,
  type PhaseState,
} from '../../shared/ui/Focus';
import { Icon } from '../../shared/ui/Icon';
import { Text } from '../../shared/ui/Text';
import { Caption, Row, Section, Stack } from './kit';

const noop = () => {};
const MIN = 60_000;

// Spec 04 sample: 50/10, 21:47, 32:10 left.
const timers: [
  string,
  FocusPhase,
  PhaseState,
  number,
  number,
  string,
  string,
][] = [
  [
    'focus',
    'focus',
    'running',
    32 * MIN + 10_000,
    50 * MIN,
    'Tập trung',
    'Vòng 1 · nghỉ lúc 22:19',
  ],
  [
    'short-break',
    'short_break',
    'running',
    6 * MIN + 40_000,
    10 * MIN,
    'Nghỉ ngắn',
    'Hết nghỉ lúc 21:54',
  ],
  [
    'long-break',
    'long_break',
    'running',
    21 * MIN + 15_000,
    30 * MIN,
    'Nghỉ dài',
    'Hết nghỉ lúc 22:08',
  ],
  [
    'paused',
    'focus',
    'paused',
    32 * MIN + 10_000,
    50 * MIN,
    'Đã tạm dừng',
    'Đồng hồ đứng yên, không tính phút',
  ],
  [
    'waiting',
    'short_break',
    'waiting',
    8 * MIN + 12_000,
    10 * MIN,
    'Hết giờ nghỉ',
    'Bấm Học tiếp để bắt đầu vòng mới',
  ],
];

export function FocusSections() {
  return (
    <>
      <Section title="C-16 · PhaseBadge">
        <Caption>M · S live · S live paused · S waiting</Caption>
        <Stack>
          <PhaseBadge phase="focus" size="M" label="Tập trung" />
          <PhaseBadge phase="short_break" size="M" label="Nghỉ ngắn" />
          <PhaseBadge phase="long_break" size="M" label="Nghỉ dài" />
          <PhaseBadge phase="focus" size="S" label="Tập trung" time="18:42" />
          <PhaseBadge
            phase="focus"
            state="paused"
            size="S"
            label="Tạm dừng"
            time="18:42"
          />
          <PhaseBadge
            phase="short_break"
            state="waiting"
            size="S"
            label="Hết giờ nghỉ"
          />
        </Stack>
      </Section>
      <Section title="C-06 · FocusTimer · ring">
        {timers.map(([name, phase, state, left, total, label, line]) => (
          <Stack key={name}>
            <Caption>{name}</Caption>
            <FocusTimer
              phase={phase}
              state={state}
              leftMs={left}
              totalMs={total}
              label={label}
              lines={[line]}
              long={false}
              accessibilityLabel={label}
            />
          </Stack>
        ))}
        <Caption>120:00 · timer-long</Caption>
        <FocusTimer
          phase="focus"
          state="running"
          leftMs={120 * MIN}
          totalMs={120 * MIN}
          label="Tập trung"
          lines={['Vòng 1 · nghỉ lúc 23:47', 'Từ vòng sau: 25/5']}
          long
          accessibilityLabel="Tập trung"
        />
      </Section>
      <Section title="C-17 · RoomControl">
        <Row>
          <RoomControl icon={SkipForward} label="Bỏ qua pha" onPress={noop} />
          <RoomControl main icon={Pause} label="Tạm dừng" onPress={noop} />
          <RoomControl main icon={Play} label="Tiếp tục" onPress={noop} />
          <RoomControl icon={Square} label="Dừng" onPress={noop} />
        </Row>
      </Section>
      <Section title="C-08 · MiniPlayer · solo, solo-waiting">
        <MiniPlayer
          icon={<Icon as={LampDesk} color="phase-focus" />}
          title="Học một mình"
          line={
            <PhaseBadge phase="focus" size="S" label="Tập trung" time="32:10" />
          }
          actions={
            <>
              <IconButton icon={Pause} label="Tạm dừng" />
              <IconButton icon={Square} label="Dừng" />
            </>
          }
          onOpen={noop}
        />
        <MiniPlayer
          icon={<Icon as={Coffee} color="phase-short" />}
          title="Hết giờ nghỉ"
          line={
            <Text variant="label" color="text-secondary">
              Còn 08:12 để học tiếp
            </Text>
          }
          actions={<Button size="S" label="Học tiếp" onPress={noop} />}
          onOpen={noop}
        />
      </Section>
    </>
  );
}
