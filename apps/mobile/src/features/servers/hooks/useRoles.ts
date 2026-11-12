import {
  Permission,
  hasPermission,
  type CreateRoleRequest,
  type RoleResponse,
  type UpdateRolePositionsRequest,
  type UpdateRoleRequest,
} from '@nezfocus/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react-native';
import { useEffect, useEffectEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { serverRepository } from '../../../data/servers';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  removeRole,
  setRoles,
  upsertRole,
} from '../../../domain/servers/homeStore';
import {
  roleActor,
  roleErrorOf,
  type RoleError,
} from '../../../domain/servers/roles';
import { showToast } from '../../../shared/ui/Toast';
import { managementLost } from '../../../domain/servers/serverAccess';
import { useServerAccess, useServerListLoaded } from './useServerAccess';

export type RoleResult<T = void> =
  { ok: true; value: T } | { ok: false; error: RoleError };

const attempt = async <T>(run: () => Promise<T>): Promise<RoleResult<T>> => {
  try {
    return { ok: true, value: await run() };
  } catch (err) {
    return { ok: false, error: roleErrorOf(err) };
  }
};

// S-SET-02: the roles (homeStore, kept up by SERVER_ROLE_*), their member counts (the
// list endpoint only), the caller as the hierarchy sees them, and the writes. Losing
// MANAGE_ROLES closes the screen (spec 08 › Edge case P2) through `onLostAccess`.
export function useRoles(serverId: string, onLostAccess: () => void) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const access = useServerAccess(serverId);
  const listLoaded = useServerListLoaded();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const key = ['servers', serverId, 'roles'];
  const listed = useQuery({
    queryKey: key,
    queryFn: async () => {
      const list = await serverRepository.listRoles(serverId);
      setRoles(serverId, list);
      return list;
    },
  });
  const counts = new Map(
    (listed.data ?? []).map((r) => [r.id, r.member_count] as const),
  );

  const canManage =
    !!access && hasPermission(access.perms, Permission.MANAGE_ROLES);
  const lost = managementLost({
    listLoaded,
    found: !!access,
    rolesLoaded: access?.roles !== undefined,
    allowed: canManage,
  });
  const lose = () => {
    showToast({ message: t('servers.roles.lostAccess') });
    onLostAccess();
  };
  const onLost = useEffectEvent(lose);
  useEffect(() => {
    if (lost) onLost();
  }, [lost]);

  const roles = access?.roles ?? [];
  const actor =
    access?.userId && access.roles
      ? roleActor(access.server, access.roles, access.userId, access.roleIds)
      : null;
  const recount = () => void qc.invalidateQueries({ queryKey: key });

  // The answer of every refused write that has no sentence of its own on the screen.
  const explain = (error: RoleError) => {
    if (error === 'forbidden') return lose();
    if (error === 'hierarchy')
      return showToast({ message: t('servers.roles.outranked'), icon: Shield });
    if (error === 'gone')
      return showToast({ message: t('servers.roles.gone') });
    showToast({ message: t('servers.settings.saveFailed') });
  };

  return {
    server: access?.server,
    roles,
    actor,
    counts,
    offline,
    explain,
    create: async (body: CreateRoleRequest) => {
      const r = await attempt(() =>
        serverRepository.createRole(serverId, body),
      );
      if (r.ok) {
        upsertRole(serverId, r.value);
        recount();
      }
      return r;
    },
    update: async (roleId: string, body: UpdateRoleRequest) => {
      const r = await attempt(() =>
        serverRepository.updateRole(serverId, roleId, body),
      );
      if (r.ok) upsertRole(serverId, r.value);
      return r;
    },
    remove: async (role: RoleResponse) => {
      const r = await attempt(() =>
        serverRepository.deleteRole(serverId, role.id),
      );
      if (r.ok) removeRole(serverId, role.id);
      return r;
    },
    // The positions show at once; SERVER_ROLE_UPDATE confirms them, a refusal puts them back.
    reorder: async (body: UpdateRolePositionsRequest) => {
      const before = roles;
      const at = new Map(body.map((p) => [p.id, p.position]));
      setRoles(
        serverId,
        roles.map((r) => ({ ...r, position: at.get(r.id) ?? r.position })),
      );
      const r = await attempt(() =>
        serverRepository.setRolePositions(serverId, body),
      );
      if (!r.ok) setRoles(serverId, before);
      return r;
    },
  };
}
