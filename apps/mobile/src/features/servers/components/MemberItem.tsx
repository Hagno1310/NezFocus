import {
  memberName,
  type RoleResponse,
  type ServerMember,
  type ServerSummary,
} from '@nezfocus/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { memberRightLabel, untilText } from '../../../domain/servers/members';
import { avatarUri } from '../../me/avatarUri';
import { useShownPresence } from '../../presence/hooks/usePresence';
import { ActivityLine } from '../../../shared/ui/ActivityLine';
import { MemberRow } from '../../../shared/ui/MemberRow';

// One member of a server as C-28 draws them, with live presence and the right label.
export function MemberItem({
  member,
  server,
  roles,
  now,
  timeZone,
  variant,
  activity = false,
  right,
  label: own,
  timeout = false,
  onPress,
}: {
  member: ServerMember;
  server: Pick<ServerSummary, 'id' | 'owner_id'>;
  roles: readonly RoleResponse[];
  now: number;
  timeZone: string;
  variant?: 'inline' | 'username';
  activity?: boolean; // S-HOME-03: line 2 when they are studying
  right?: ReactNode;
  label?: string; // replaces the role label ("Đã có vai trò")
  timeout?: boolean; // S-SET-03: "Tạm khóa tới …" in place of the role
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const presence = useShownPresence(member.user.id);
  const name = memberName(member);
  const side = memberRightLabel(server, roles, member, timeout ? now : null);
  const label =
    own ??
    (side?.kind === 'owner'
      ? t('servers.members.owner')
      : side?.kind === 'role'
        ? side.name
        : side?.kind === 'timeout'
          ? t('servers.members.timedOut', {
              time: untilText(side.until, now, timeZone),
            })
          : null);
  return (
    <MemberRow
      name={name}
      username={member.user.username}
      avatar={avatarUri(member.user.avatar, '128')}
      presence={presence.status}
      label={label}
      labelColor={side?.kind === 'timeout' ? 'text-secondary' : undefined}
      variant={variant}
      line2={
        activity && presence.activity ? (
          <ActivityLine activity={presence.activity} form="short" />
        ) : undefined
      }
      right={right}
      onPress={onPress}
    />
  );
}
