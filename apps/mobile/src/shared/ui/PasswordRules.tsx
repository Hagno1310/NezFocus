import type { PasswordIssue } from '@nezfocus/shared';
import { Circle, CircleCheck, CircleX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  fontScale as textScale,
  size,
  space,
  typography,
  type ColorToken,
} from '../theme';
import { Icon, type IconComponent } from './Icon';
import { passwordRuleStates, type RuleState } from './logic';
import { Text } from './Text';

const look: Record<
  RuleState,
  { icon: IconComponent; tint: ColorToken; text: ColorToken }
> = {
  unmet: { icon: Circle, tint: 'text-tertiary', text: 'text-tertiary' },
  met: { icon: CircleCheck, tint: 'success', text: 'text-secondary' },
  error: { icon: CircleX, tint: 'danger', text: 'danger' },
};

// C-02 › PasswordRules: always visible under the password field; `issues` from checkPassword (shared).
export function PasswordRules({
  issues,
  submitted,
}: {
  issues: readonly PasswordIssue[];
  // After the form was submitted, unmet rules turn into errors.
  submitted: boolean;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  // At 200% the 2-column grid becomes 1 column.
  const columns = fontScale >= textScale.large ? 1 : 2;
  return (
    <View style={styles.grid}>
      {passwordRuleStates(issues, submitted).map(([rule, state]) => {
        const l = look[state];
        const label = t(`ui.passwordRules.${rule}`);
        return (
          <View
            key={rule}
            accessible
            accessibilityLabel={`${label}, ${t(state === 'met' ? 'ui.passwordRules.met' : 'ui.passwordRules.unmet')}`}
            style={[styles.item, { width: columns === 2 ? '50%' : '100%' }]}
          >
            <View style={styles.iconBox}>
              <Icon as={l.icon} size="sm" color={l.tint} />
            </View>
            <Text
              variant="label"
              weight="400"
              color={l.text}
              style={styles.flex}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[1] },
  item: { flexDirection: 'row', gap: size.iconGap, paddingRight: space[2] },
  iconBox: {
    height: typography.label.lineHeight,
    justifyContent: 'center',
    width: size.icon.sm,
  },
  flex: { flex: 1 },
});
