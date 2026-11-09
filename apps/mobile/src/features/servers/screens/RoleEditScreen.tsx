import { ROLE_NAME_MAX, type PermissionName } from '@nezfocus/shared';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Info, Lock, Trash2, Users } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkRoleName,
  roleEditor,
  withPermissions,
  type RoleError,
} from '../../../domain/servers/roles';
import { disabledOpacity, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { Dialog } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import type { vi } from '../../../shared/i18n/vi';
import { homeStore } from '../../../domain/servers/homeStore';
import { useRoles } from '../hooks/useRoles';

type PermissionLabels = (typeof vi)['permissions']['labels'];
import { NoteLine } from '../../../shared/ui/NoteLine';

// S-SET-02 `edit-role` (+ `-middle`, `-lower`), `edit-role-name-taken`, `everyone`,
// `role-readonly`, `permission-locked` (+ `-lower`), `admin-on`, `delete-confirm`,
// `save-error`; Edge case `edit-role-large-text` and the P2 rules (lost MANAGE_ROLES,
// demoted, two people editing). Switches save on tap; the name saves with "Lưu".
export function RoleEditScreen({
  serverId,
  roleId,
  onMembers,
  onLostAccess,
}: {
  serverId: string;
  roleId: string;
  onMembers: (title: string) => void; // ponytail: `role-members` with P2-A2 (#15)
  onLostAccess: () => void; // back to S-SET-01
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const navigation = useNavigation();
  const roles = useRoles(serverId, onLostAccess);
  const role = roles.roles.find((r) => r.id === roleId);
  // null: the field shows the saved name, so someone else's rename shows too.
  const [draft, setDraft] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<
    Partial<Record<PermissionName, boolean>>
  >({});
  const [mentionPending, setMentionPending] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleted = useRef(false);
  const inFlight = useRef<Partial<Record<PermissionName, boolean>>>({});

  const editor =
    role && roles.actor
      ? roleEditor(serverId, role, roles.roles, roles.actor)
      : null;
  const readonly = !!editor?.readonly;
  const dirty = !!role && draft !== null && draft !== role.name;

  // Edge case P2: demoted while editing → `role-readonly` + Toast.
  const wasReadonly = useRef<boolean | null>(null);
  const onDemoted = useEffectEvent(() =>
    showToast({ message: t('servers.roles.demoted') }),
  );
  useEffect(() => {
    if (!editor) return;
    if (wasReadonly.current === false && readonly) onDemoted();
    wasReadonly.current = readonly;
  }, [editor, readonly]);

  // The role went away (someone deleted it): back to the list.
  const gone = !role && roles.roles.length > 0;
  const onGone = useEffectEvent(() => {
    if (!deleted.current) showToast({ message: t('servers.roles.gone') });
    navigation.goBack();
  });
  useEffect(() => {
    if (gone) onGone();
  }, [gone]);

  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  usePreventRemove(dirty && !saving && !readonly, ({ data }) =>
    setLeaving(() => () => navigation.dispatch(data.action)),
  );

  if (!role || !editor) return null;
  const { offline } = roles;
  const locked = readonly || offline;

  const explain = (error: RoleError) => roles.explain(error);
  const saveFailed = (retry: () => void) =>
    showToast({
      message: t('servers.settings.saveFailed'),
      action: { label: t('servers.settings.retry'), onPress: retry },
    });

  const saveName = async () => {
    const checked = checkRoleName(roles.roles, draft ?? role.name, role.id);
    if (!checked.ok)
      return setNameError(
        checked.error === 'taken'
          ? t('servers.roles.taken', { name: checked.taken })
          : checked.error === 'reserved'
            ? t('servers.roles.reserved')
            : null,
      );
    setSaving(true);
    const r = await roles.update(role.id, { name: checked.name });
    setSaving(false);
    if (r.ok) return setDraft(null);
    if (r.error === 'taken')
      return setNameError(t('servers.roles.taken', { name: checked.name }));
    if (r.error === 'reserved')
      return setNameError(t('servers.roles.reserved'));
    if (r.error === 'failed') return saveFailed(() => void saveName());
    explain(r.error);
  };

  // `save-error`: the switch goes back and the Toast offers to try again. Each save sends
  // every switch still in flight, so two quick taps never undo each other.
  const flip = async (name: PermissionName, on: boolean) => {
    inFlight.current[name] = on;
    setPending({ ...inFlight.current });
    const latest =
      homeStore.getState().roles[serverId]?.find((r) => r.id === roleId) ??
      role;
    const r = await roles.update(role.id, {
      permissions: withPermissions(latest, inFlight.current),
    });
    if (inFlight.current[name] === on) delete inFlight.current[name];
    setPending({ ...inFlight.current });
    if (r.ok) return;
    if (r.error === 'failed') return saveFailed(() => void flip(name, on));
    explain(r.error);
  };

  const flipMention = async (on: boolean) => {
    setMentionPending(on);
    const r = await roles.update(role.id, { is_mentionable: on });
    setMentionPending(null);
    if (r.ok) return;
    if (r.error === 'failed') return saveFailed(() => void flipMention(on));
    explain(r.error);
  };

  const remove = async () => {
    setDeleting(true);
    const r = await roles.remove(role);
    setDeleting(false);
    setConfirming(false);
    if (r.ok) {
      deleted.current = true;
      return navigation.goBack();
    }
    if (r.error === 'failed') return saveFailed(() => void remove());
    explain(r.error);
  };

  const count = roles.counts.get(role.id);
  const name = draft ?? role.name;
  // Only the bits of ROLE_PERMISSION_GROUPS have a row, so only they have a label.
  const label = (p: PermissionName) =>
    t(`permissions.labels.${p as keyof PermissionLabels}`);
  const hint = (p: PermissionName) =>
    t(`permissions.hints.${p}`, { defaultValue: '' }) || undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={role.name}
        onBack={navigation.goBack}
        action={
          editor.everyone || readonly ? undefined : (
            <Button
              variant="text"
              size="S"
              label={t('servers.roles.save')}
              disabled={!dirty || offline}
              loading={saving}
              onPress={() => void saveName()}
            />
          )
        }
      />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {editor.everyone && (
          <NoteLine icon={Info} text={t('servers.roles.everyoneHint')} />
        )}
        {readonly && (
          <NoteLine icon={Lock} text={t('servers.roles.readonly')} />
        )}
        {!editor.everyone && (
          <>
            <TextField
              label={t('servers.roles.nameLabel')}
              value={name}
              onChangeText={(v) => {
                setDraft(v);
                setNameError(null);
              }}
              counterMax={ROLE_NAME_MAX}
              maxLength={ROLE_NAME_MAX}
              error={nameError}
              disabled={locked}
              returnKeyType="done"
              onSubmitEditing={() => dirty && void saveName()}
            />
            <SettingsRow
              label={t('servers.roles.mention', { name: role.name })}
              description={t('servers.roles.mentionHint', { name: role.name })}
              toggle={{
                value: mentionPending ?? role.is_mentionable,
                onChange: (v) => void flipMention(v),
              }}
              disabled={locked}
            />
            <SettingsRow
              icon={Users}
              label={t('servers.roles.members')}
              value={
                count === undefined
                  ? undefined
                  : t('servers.roles.people', { count })
              }
              onPress={() => onMembers(t('servers.roles.members'))}
            />
          </>
        )}
        {editor.groups.map((group) => (
          <View key={group.id}>
            <Text
              variant="label"
              weight="600"
              color="text-tertiary"
              style={styles.group}
            >
              {t(`servers.roles.groups.${group.id}`)}
            </Text>
            {group.rows.map((row) => {
              const on = pending[row.name] ?? row.on;
              const dimmed = editor.adminOn && row.name !== 'ADMINISTRATOR';
              return (
                <View key={row.name}>
                  <SettingsRow
                    label={label(row.name)}
                    description={
                      readonly
                        ? undefined
                        : row.locked
                          ? t('servers.roles.locked')
                          : hint(row.name)
                    }
                    toggle={{
                      value: on,
                      onChange: (v) => void flip(row.name, v),
                    }}
                    disabled={locked || row.locked || dimmed}
                  />
                  {row.name === 'ADMINISTRATOR' && editor.adminOn && (
                    <Text
                      variant="label"
                      color="text-secondary"
                      style={styles.adminOn}
                    >
                      {t('servers.roles.adminOn')}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        {!editor.everyone && !readonly && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('servers.roles.delete')}
            accessibilityState={{ disabled: offline }}
            disabled={offline}
            onPress={() => setConfirming(true)}
            style={[styles.danger, offline && { opacity: disabledOpacity }]}
          >
            <Icon as={Trash2} size="lg" color="danger" />
            <Text color="danger">{t('servers.roles.delete')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Dialog
        visible={confirming}
        title={t('servers.roles.deleteTitle', { name: role.name })}
        body={t('servers.roles.deleteBody', { count: count ?? 0 })}
        cancel={{
          label: t('servers.roles.cancel'),
          onPress: () => setConfirming(false),
        }}
        confirm={{
          label: t('servers.roles.delete'),
          variant: 'danger',
          loading: deleting,
          onPress: () => void remove(),
        }}
        onDismiss={() => setConfirming(false)}
      />
      <Dialog
        visible={!!leaving}
        title={t('servers.settings.discardTitle')}
        body={t('servers.roles.discardBody')}
        cancel={{
          label: t('servers.settings.stay'),
          onPress: () => setLeaving(null),
        }}
        confirm={{
          label: t('servers.settings.discard'),
          variant: 'danger',
          onPress: () => {
            const go = leaving;
            setLeaving(null);
            go?.();
          },
        }}
        onDismiss={() => setLeaving(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[3], gap: space[1] },
  group: { height: size.groupTitle, paddingTop: space[2] },
  adminOn: { paddingBottom: space[2] },
  danger: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    marginTop: space[3],
  },
});
