import {
  DEFAULT_EVERYONE_PERMISSIONS,
  permissionBits,
  type ChannelType,
  type FocusControl,
  type ServerTemplate,
} from '@nezfocus/shared';
import {
  ChannelTypeCode,
  type channels,
  type roles,
  type servers,
} from './servers.schema.js';

type Plan = {
  type: ChannelType;
  name: string;
  focusControl?: FocusControl;
  children?: Plan[];
};

// REQ-SRV-01 (general) and REQ-STUDY-05 (study_server). The first text channel welcomes.
// ponytail: names follow the creator's UI language (NFR-I18N-04) once the Study Server
// template ships through the API, P4-A2 (#168); P1 creates Vietnamese names only.
const TEMPLATES: Record<
  ServerTemplate,
  { channels: Plan[]; ownerRole?: { name: string; permissions: bigint } }
> = {
  general: {
    channels: [
      {
        type: 'category',
        name: 'Kênh chung',
        children: [
          { type: 'text', name: 'general' },
          { type: 'voice', name: 'Phòng thoại chung', focusControl: 'off' },
        ],
      },
    ],
  },
  study_server: {
    // ponytail: #thong-bao's @everyone deny SEND_MESSAGES needs overwrites, P1-A3.1 (#64);
    // #viec-nhom's Task Board flag arrives with REQ-STUDY-06.
    channels: [
      {
        type: 'category',
        name: 'THÔNG TIN',
        children: [
          'chao-mung',
          'thong-bao',
          'tai-lieu',
          'hoi-dap',
          'viec-nhom',
        ].map((name) => ({ type: 'text', name })),
      },
      {
        type: 'category',
        name: 'PHÒNG HỌC',
        children: ['Phòng học im lặng', 'Phòng thảo luận nhóm'].map((name) => ({
          type: 'voice',
          name,
          focusControl: 'everyone',
        })),
      },
    ],
    ownerRole: {
      name: 'Trưởng nhóm', // SRS 8.5.3
      permissions: permissionBits(
        'MANAGE_STUDY_ROOMS',
        'MANAGE_TASKS',
        'MANAGE_EVENTS',
        'MANAGE_MESSAGES',
        'MODERATE_MEMBERS',
        'KICK_MEMBERS',
      ),
    },
  },
};

export type ServerRows = {
  server: typeof servers.$inferInsert;
  roles: (typeof roles.$inferInsert)[];
  channels: (typeof channels.$inferInsert)[];
  ownerRoleIds: bigint[]; // besides @everyone
};

// Every row a new server starts with; the repository writes them in one transaction.
export function buildServer(
  template: ServerTemplate,
  o: { name: string; ownerId: bigint; now: Date; nextId: () => bigint },
): ServerRows {
  const serverId = o.nextId();
  const plan = TEMPLATES[template];
  const rows: ServerRows['channels'] = [];
  const add = (p: Plan, position: number, parentId: bigint | null) => {
    const id = o.nextId();
    rows.push({
      id,
      serverId,
      parentId,
      type: ChannelTypeCode[p.type],
      name: p.name,
      position,
      focusControl: p.focusControl ?? 'off',
      createdAt: o.now,
    });
    p.children?.forEach((child, i) => add(child, i, id));
  };
  plan.channels.forEach((p, i) => add(p, i, null));

  const everyone = {
    id: serverId,
    serverId,
    name: '@everyone',
    permissions: DEFAULT_EVERYONE_PERMISSIONS,
    position: 0,
    createdAt: o.now,
  };
  const ownerRole = plan.ownerRole && {
    ...plan.ownerRole,
    id: o.nextId(),
    serverId,
    position: 1,
    createdAt: o.now,
  };

  return {
    server: {
      id: serverId,
      name: o.name,
      ownerId: o.ownerId,
      template,
      systemChannelId:
        rows.find((c) => c.type === ChannelTypeCode.text)?.id ?? null,
      createdAt: o.now,
    },
    roles: ownerRole ? [everyone, ownerRole] : [everyone],
    channels: rows,
    ownerRoleIds: ownerRole ? [ownerRole.id] : [],
  };
}
