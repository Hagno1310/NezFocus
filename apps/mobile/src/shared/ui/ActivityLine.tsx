import {
  activityBlock,
  activityIcon,
  activityLine,
  activityText,
  type ActivitySegment,
  type StudyActivity,
} from '@nezfocus/shared';
import { Coffee, LampDesk, Pause, Volume2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, space, useTheme, type ColorToken } from '../theme';
import { phaseColor, phaseIcon } from './Focus';
import { Icon, type IconComponent } from './Icon';
import { Text, type AppTextProps } from './Text';

// C-40: "còn N phút" moves every minute, never by the second.
function useMinute(fixed?: Date) {
  const [now, setNow] = useState(() => fixed ?? new Date());
  useEffect(() => {
    if (fixed) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [fixed]);
  return fixed ?? now;
}

// C-40 › Icon 14: the phase icon in its colour while running (and the wait, like PhaseBadge).
function iconOf(a: StudyActivity): { as: IconComponent; color: ColorToken } {
  const icon = activityIcon(a);
  const phase =
    a.kind === 'solo'
      ? a.phase
      : (a.kind === 'group_study' && a.room?.phase) || null;
  if (icon === 'paused') return { as: Pause, color: 'text-secondary' };
  if (icon === 'waiting')
    return { as: Coffee, color: phase ? phaseColor[phase] : 'text-secondary' };
  if (icon === 'study_room') return { as: LampDesk, color: 'text-secondary' };
  if (icon === 'voice') return { as: Volume2, color: 'text-secondary' };
  return { as: phaseIcon[icon], color: phaseColor[icon] };
}

// C-40 › Cắt: one line; only "còn N phút" never shrinks, the rest cut "…" first.
function Segments({
  segments,
  ...text
}: { segments: ActivitySegment[] } & AppTextProps) {
  return (
    <View style={styles.segments}>
      {segments.map((s, i) => (
        <Text
          key={i}
          numberOfLines={1}
          {...text}
          style={s.shrink ? styles.shrink : styles.keep}
        >
          {i ? `· ${s.text}` : s.text}
        </Text>
      ))}
    </View>
  );
}

// C-40 ActivityLine: `short` (DMRow, MemberRow), `full` (FriendRow, DM header), `block` (S-HOME-10).
export function ActivityLine({
  activity,
  form,
  now,
}: {
  activity: StudyActivity;
  form: 'short' | 'full' | 'block';
  now?: Date; // fixed time, for the gallery
}) {
  const { colors } = useTheme();
  const at = useMinute(now);
  const icon = iconOf(activity);
  const label = activityLine(activityText(activity, 'full', at));

  if (form === 'block') {
    const b = activityBlock(activity, at);
    return (
      <View
        accessible
        accessibilityLabel={label}
        style={[styles.block, { backgroundColor: colors['surface-2'] }]}
      >
        <View style={styles.blockRow}>
          <Icon as={icon.as} size="xs" color={icon.color} />
          <Segments
            segments={b.title}
            variant="body-sm"
            weight="600"
            color="text-primary"
          />
        </View>
        {b.subtitle && (
          <Text variant="label" color="text-secondary" numberOfLines={1}>
            {b.subtitle}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={label} style={styles.line}>
      <Icon as={icon.as} size="xs" color={icon.color} />
      <Segments
        segments={activityText(activity, form, at)}
        variant="label"
        color="text-secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  segments: { flexDirection: 'row', flexShrink: 1, gap: space[1] },
  shrink: { flexShrink: 1 },
  keep: { flexShrink: 0 },
  // Board C-40 · block: padding 12, lines 2 apart, icon 6 from the title.
  block: { padding: 12, gap: 2, borderRadius: radius.button },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
