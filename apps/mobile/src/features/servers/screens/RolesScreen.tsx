import { ROLE_NAME_MAX, type RoleResponse } from '@nezfocus/shared';
import { GripVertical, Lock, Shield, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkRoleName,
  dropRole,
  roleList,
  type RoleError,
  type RoleListRow,
} from '../../../domain/servers/roles';
import { useOnOpen } from '../../../shared/hooks/useOnOpen';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { NoteLine } from '../../../shared/ui/NoteLine';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { RoleReorderList } from '../components/RoleReorderList';
import { useRoles } from '../hooks/useRoles';

// S-SET-02 `list`, `reorder`, `hierarchy-blocked`, `limit`, `offline`, `create-sheet`,
// `create-name-taken`; Edge case `long-role-name`, `roles-empty`.
// ponytail: role colours and hoist are v1.x (Q1); members of a role open P2-A2 (#15).
export function RolesScreen({
  serverId,
  onBack,
  onEdit,
  onLostAccess,
}: {
  serverId: string;
  onBack: () => void;
  onEdit: (roleId: string) => void;
  onLostAccess: () => void; // back to S-SET-01
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const roles = useRoles(serverId, onLostAccess);
  const [reordering, setReordering] = useState(false);
  const [creating, setCreating] = useState(false);
  if (!roles.actor) return null;
  const { actor, offline } = roles;
  const list = roleList(serverId, roles.roles, actor);
  const above = list.rows.filter((r) => !r.everyone);
  const everyone = list.rows.find((r) => r.everyone);
  const sorting = reordering && !offline;

  const people = (row: RoleListRow) => {
    if (row.everyone) return t('servers.roles.everyoneValue');
    if (row.locked && row.role.position === actor.highest)
      return t('servers.roles.level');
    const count = roles.counts.get(row.role.id);
    return count === undefined
      ? undefined
      : t('servers.roles.people', { count });
  };

  const drop = async (from: number, to: number) => {
    const role = above[from]?.role;
    if (!role) return;
    // CR-17 #10: a drop to or above the caller's highest goes back, without a call.
    const plan = dropRole(serverId, roles.roles, role.id, to, actor);
    if (!plan.ok || !plan.body) return;
    const r = await roles.reorder(plan.body);
    if (!r.ok) roles.explain(r.error);
  };

  const line = list.atLimit ? (
    <NoteLine text={t('servers.roles.limit', { count: roles.roles.length })} />
  ) : list.blockedBy ? (
    <NoteLine
      icon={Lock}
      text={t('servers.roles.blocked', { name: list.blockedBy.name })}
    />
  ) : (
    <NoteLine text={t('servers.roles.hint')} />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={t('servers.roles.title')}
        onBack={onBack}
        action={
          above.length > 0 ? (
            <Button
              variant="text"
              size="S"
              label={
                sorting ? t('servers.roles.done') : t('servers.roles.reorder')
              }
              disabled={offline}
              onPress={() => setReordering(!reordering)}
            />
          ) : undefined
        }
      />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        scrollEnabled={!sorting}
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        {line}
        {list.atLimit && (
          <Text
            variant="label"
            weight="600"
            color="text-tertiary"
            style={styles.group}
          >
            {t('servers.roles.limitGroup', { count: roles.roles.length })}
          </Text>
        )}
        {sorting ? (
          <RoleReorderList
            items={above}
            keyOf={(r) => r.role.id}
            draggable={(r) => !r.locked}
            onDrop={(from, to) => void drop(from, to)}
            renderItem={(r) => (
              <View style={styles.sortRow}>
                <Icon
                  as={r.locked ? Lock : GripVertical}
                  size="lg"
                  color={r.locked ? 'text-tertiary' : 'text-secondary'}
                />
                <Text weight="500" numberOfLines={1} style={styles.flex}>
                  {r.role.name}
                </Text>
                {r.locked && (
                  <Text color="text-secondary">{t('servers.roles.level')}</Text>
                )}
              </View>
            )}
          />
        ) : (
          above.map((r) => (
            <SettingsRow
              key={r.role.id}
              icon={r.locked ? Lock : Shield}
              label={r.role.name}
              value={people(r)}
              disabled={offline}
              onPress={() => onEdit(r.role.id)}
            />
          ))
        )}
        {everyone &&
          (sorting ? (
            <View style={styles.sortRow}>
              <Icon as={Users} size="lg" color="text-tertiary" />
              <Text weight="500" style={styles.flex}>
                {everyone.role.name}
              </Text>
              <Text color="text-secondary">
                {t('servers.roles.alwaysLast')}
              </Text>
            </View>
          ) : (
            <SettingsRow
              icon={Users}
              label={everyone.role.name}
              value={people(everyone)}
              disabled={offline}
              onPress={() => onEdit(everyone.role.id)}
            />
          ))}
        {list.empty && <NoteLine text={t('servers.roles.empty')} />}
        {!list.atLimit && !sorting && (
          <Button
            variant="secondary"
            label={t('servers.roles.create')}
            fullWidth
            disabled={offline}
            onPress={() => setCreating(true)}
            style={styles.create}
          />
        )}
      </ScrollView>
      <CreateRoleSheet
        visible={creating}
        roles={roles.roles}
        onDismiss={() => setCreating(false)}
        create={roles.create}
        explain={roles.explain}
        onCreated={(role) => {
          setCreating(false);
          onEdit(role.id);
        }}
      />
    </View>
  );
}

// `create-sheet` / `create-name-taken`: the sheet stays open, the keyboard too, on an error.
function CreateRoleSheet({
  visible,
  roles,
  create,
  explain,
  onDismiss,
  onCreated,
}: {
  visible: boolean;
  roles: readonly RoleResponse[];
  create: ReturnType<typeof useRoles>['create'];
  explain: (e: RoleError) => void;
  onDismiss: () => void;
  onCreated: (role: RoleResponse) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useOnOpen(visible, () => {
    setName('');
    setError(null);
  });

  const nameError = (e: RoleError, taken?: string) =>
    e === 'taken'
      ? t('servers.roles.taken', { name: taken ?? name.trim() })
      : e === 'reserved'
        ? t('servers.roles.reserved')
        : null;

  const submit = async () => {
    const checked = checkRoleName(roles, name);
    if (!checked.ok) return setError(nameError(checked.error, checked.taken));
    setSaving(true);
    const r = await create({ name: checked.name });
    setSaving(false);
    if (r.ok) return onCreated(r.value);
    const field = nameError(r.error);
    if (field) return setError(field);
    onDismiss();
    explain(r.error);
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('servers.roles.create')}
      onDismiss={onDismiss}
      action={{
        label: t('servers.roles.createAction'),
        loading: saving,
        disabled: !name.trim(),
        onPress: () => void submit(),
      }}
    >
      <TextField
        label={t('servers.roles.nameLabel')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        counterMax={ROLE_NAME_MAX}
        maxLength={ROLE_NAME_MAX}
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      <Text variant="label" color="text-secondary">
        {t('servers.roles.createHint')}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space[3] },
  group: { height: size.groupTitle, paddingTop: space[2] },
  sortRow: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
  create: { marginTop: space[3] },
});
