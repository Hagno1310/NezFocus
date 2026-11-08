// TS-PERM (SRS 9.2): the library and the DB-backed PermissionService (#65) must both return `expected`.
// Sample server "Ôn thi Giải tích 2": Owner An; Quản trị (Tuấn) > Trưởng nhóm (An, Bình) > Điều phối (Chi).
import {
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE_PERMISSIONS as DEFAULTS,
  Permission as P,
  permissionBits,
  type PermissionChannel,
  type PermissionMember,
  type PermissionName,
  type PermissionOverwriteInput,
  type PermissionRole,
  type PermissionServer,
} from './permissions.js';

export interface PermissionCase {
  name: string;
  server: PermissionServer;
  member: PermissionMember;
  channel?: PermissionChannel; // absent → server-level
  now: Date;
  expected: bigint;
}

interface HierarchyBase {
  name: string;
  server: PermissionServer;
  actor: PermissionMember;
  expected: boolean;
}

type HierarchyCheck =
  | { check: 'role'; role: PermissionRole }
  | { check: 'member'; target: PermissionMember }
  | { check: 'timeout'; target: PermissionMember }
  | { check: 'grant'; permissions: bigint };

export type HierarchyCase = HierarchyBase & HierarchyCheck;

const ID = {
  server: '1000', // also the @everyone role
  dieuPhoi: '1001',
  truongNhom: '1002',
  quanTri: '1003',
  an: '1',
  binh: '2',
  chi: '3',
  dung: '4',
  tuan: '5',
  khanh: '6',
};

// SRS 8.5.3: the Study Server template's "Trưởng nhóm".
const LEADER = permissionBits(
  'MANAGE_STUDY_ROOMS',
  'MANAGE_TASKS',
  'MANAGE_EVENTS',
  'MANAGE_MESSAGES',
  'MODERATE_MEMBERS',
  'KICK_MEMBERS',
);

const NOW = new Date('2026-10-18T14:47:00Z'); // 21:47 in Vietnam
const minutesFromNow = (min: number) => new Date(NOW.getTime() + min * 60_000);

const without = (perms: bigint, ...names: PermissionName[]) =>
  perms & ~permissionBits(...names);

// Losing SEND_MESSAGES in a text channel also drops these (8.5.2 step 4).
const NO_SEND_TEXT = ['SEND_MESSAGES', 'ATTACH_FILES', 'EMBED_LINKS'] as const;

const world = (
  perms: {
    everyone?: bigint;
    dieuPhoi?: bigint;
    truongNhom?: bigint;
    quanTri?: bigint;
  } = {},
): PermissionServer => ({
  id: ID.server,
  ownerId: ID.an,
  roles: [
    { id: ID.server, permissions: perms.everyone ?? DEFAULTS, position: 0 },
    {
      id: ID.dieuPhoi,
      permissions: perms.dieuPhoi ?? P.MANAGE_STUDY_ROOMS,
      position: 1,
    },
    { id: ID.truongNhom, permissions: perms.truongNhom ?? LEADER, position: 2 },
    {
      id: ID.quanTri,
      permissions: perms.quanTri ?? P.ADMINISTRATOR,
      position: 3,
    },
  ],
});

const SERVER = world();
const ROLE = Object.fromEntries(SERVER.roles.map((r) => [r.id, r]));

const an: PermissionMember = { userId: ID.an, roleIds: [ID.truongNhom] };
const tuan: PermissionMember = { userId: ID.tuan, roleIds: [ID.quanTri] };
const binh: PermissionMember = { userId: ID.binh, roleIds: [ID.truongNhom] };
const chi: PermissionMember = { userId: ID.chi, roleIds: [ID.dieuPhoi] };
const dung: PermissionMember = { userId: ID.dung, roleIds: [] };
const khanh: PermissionMember = { userId: ID.khanh, roleIds: [] };
const timedOut = (m: PermissionMember, until = minutesFromNow(10)) => ({
  ...m,
  timeoutUntil: until,
});

const ow = {
  everyone: (allow: bigint, deny: bigint): PermissionOverwriteInput => ({
    targetId: ID.server,
    type: 'role',
    allow,
    deny,
  }),
  role: (
    id: string,
    allow: bigint,
    deny: bigint,
  ): PermissionOverwriteInput => ({
    targetId: id,
    type: 'role',
    allow,
    deny,
  }),
  member: (
    id: string,
    allow: bigint,
    deny: bigint,
  ): PermissionOverwriteInput => ({
    targetId: id,
    type: 'member',
    allow,
    deny,
  }),
};

const text = (
  ...overwrites: PermissionOverwriteInput[]
): PermissionChannel => ({
  type: 'text',
  overwrites,
});
const voice = (
  ...overwrites: PermissionOverwriteInput[]
): PermissionChannel => ({
  type: 'voice',
  overwrites,
});
const category = (
  ...overwrites: PermissionOverwriteInput[]
): PermissionChannel => ({
  type: 'category',
  overwrites,
});
const synced = (
  type: 'text' | 'voice',
  parent: PermissionOverwriteInput[],
  own: PermissionOverwriteInput[] = [],
): PermissionChannel => ({
  type,
  overwrites: own,
  permissionsSynced: true,
  parent: { overwrites: parent },
});

// #thong-bao (8.5.3): @everyone deny SEND_MESSAGES.
const THONG_BAO = text(ow.everyone(0n, P.SEND_MESSAGES));
const THONG_BAO_LEADERS_POST = text(
  ow.everyone(0n, P.SEND_MESSAGES),
  ow.role(ID.truongNhom, P.SEND_MESSAGES, 0n),
);
// #ban-quan-tri: private, only Trưởng nhóm may view (REQ-ROLE-03 v1.9).
const BAN_QUAN_TRI = text(
  ow.everyone(0n, P.VIEW_CHANNEL),
  ow.role(ID.truongNhom, P.VIEW_CHANNEL, 0n),
);
// Category THÔNG TIN with @everyone deny SEND_MESSAGES.
const THONG_TIN = [ow.everyone(0n, P.SEND_MESSAGES)];
const PRIVATE_CATEGORY = [
  ow.everyone(0n, P.VIEW_CHANNEL),
  ow.role(ID.truongNhom, P.VIEW_CHANNEL, 0n),
];

type CaseInput = Omit<PermissionCase, 'server' | 'now'> &
  Partial<Pick<PermissionCase, 'server' | 'now'>>;
const c = (input: CaseInput): PermissionCase => ({
  server: SERVER,
  now: NOW,
  ...input,
});

export const PERMISSION_MATRIX: readonly PermissionCase[] = [
  // Server-level (REQ-ROLE-02, 8.5.2 computeBasePermissions)
  c({ name: 'Owner (An) có mọi quyền', member: an, expected: ALL_PERMISSIONS }),
  c({
    name: 'Owner không có role vẫn có mọi quyền khi @everyone không có bit nào',
    server: world({ everyone: 0n }),
    member: { userId: ID.an, roleIds: [] },
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: 'Member chỉ có @everyone (Dũng) nhận đúng bộ mặc định 8.5.3',
    member: dung,
    expected: DEFAULTS,
  }),
  c({
    name: 'Điều phối phòng học (Chi) = @everyone OR MANAGE_STUDY_ROOMS',
    member: chi,
    expected: DEFAULTS | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'Trưởng nhóm (Bình) = @everyone OR bộ quyền Trưởng nhóm 8.5.3',
    member: binh,
    expected: DEFAULTS | LEADER,
  }),
  c({
    name: 'ROLE-02 AC2: role X (SEND_MESSAGES) và role Y (CONNECT) → có cả hai',
    server: world({
      everyone: 0n,
      dieuPhoi: P.SEND_MESSAGES,
      truongNhom: P.CONNECT,
    }),
    member: { userId: ID.dung, roleIds: [ID.dieuPhoi, ID.truongNhom] },
    expected: P.SEND_MESSAGES | P.CONNECT,
  }),
  c({
    name: 'ROLE-02 AC1: role có ADMINISTRATOR (Tuấn, Quản trị) → mọi quyền',
    member: tuan,
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: 'ADMINISTRATOR ở role thấp nhất (Điều phối) vẫn → mọi quyền',
    server: world({ dieuPhoi: P.ADMINISTRATOR }),
    member: chi,
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: '@everyone mang ADMINISTRATOR → member không role cũng có mọi quyền',
    server: world({ everyone: DEFAULTS | P.ADMINISTRATOR }),
    member: dung,
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: 'CR-28 #17: Dũng bị tạm khóa chỉ còn VIEW_CHANNEL ở cấp server (không tạo lời mời, không tạo việc)',
    member: timedOut(dung),
    expected: P.VIEW_CHANNEL,
  }),
  c({
    name: 'CR-28 #17: Trưởng nhóm (Bình) bị tạm khóa mất cả quyền quản lý ở cấp server',
    member: timedOut(binh),
    expected: P.VIEW_CHANNEL,
  }),
  c({
    name: 'Tạm khóa đã hết → quyền cấp server bình thường',
    member: timedOut(chi, minutesFromNow(-1)),
    expected: DEFAULTS | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: '@everyone không có bit nào, member không role → không có quyền',
    server: world({ everyone: 0n }),
    member: dung,
    expected: 0n,
  }),

  // Owner / Administrator in channels
  c({
    name: 'Owner không role thấy #ban-quan-tri dù @everyone deny VIEW_CHANNEL',
    member: { userId: ID.an, roleIds: [] },
    channel: BAN_QUAN_TRI,
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: 'Administrator (Tuấn) bỏ qua overwrite, thấy #ban-quan-tri',
    member: tuan,
    channel: BAN_QUAN_TRI,
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: 'Administrator bỏ qua cả overwrite member deny VIEW_CHANNEL',
    member: tuan,
    channel: text(ow.member(ID.tuan, 0n, P.VIEW_CHANNEL)),
    expected: ALL_PERMISSIONS,
  }),

  // @everyone overwrite
  c({
    name: 'Kênh không có overwrite (#hoi-dap): Dũng giữ quyền server-level',
    member: dung,
    channel: text(),
    expected: DEFAULTS,
  }),
  c({
    name: '#thong-bao: @everyone deny SEND_MESSAGES → mất cả ATTACH_FILES, EMBED_LINKS',
    member: dung,
    channel: THONG_BAO,
    expected: without(DEFAULTS, ...NO_SEND_TEXT),
  }),
  c({
    name: '#thong-bao: overwrite Trưởng nhóm allow SEND_MESSAGES → Bình gửi được',
    member: binh,
    channel: THONG_BAO_LEADERS_POST,
    expected: DEFAULTS | LEADER,
  }),
  c({
    name: '#thong-bao: Chi (Điều phối, không có overwrite) vẫn theo @everyone deny',
    member: chi,
    channel: THONG_BAO_LEADERS_POST,
    expected: without(DEFAULTS, ...NO_SEND_TEXT) | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: '@everyone allow thêm bit không có ở server-level (MENTION_EVERYONE)',
    member: dung,
    channel: text(ow.everyone(P.MENTION_EVERYONE, 0n)),
    expected: DEFAULTS | P.MENTION_EVERYONE,
  }),
  c({
    name: 'Một overwrite vừa deny vừa allow cùng bit → allow thắng (deny áp trước)',
    member: dung,
    channel: text(ow.everyone(P.SEND_MESSAGES, P.SEND_MESSAGES)),
    expected: DEFAULTS,
  }),
  c({
    name: '@everyone deny cả bit mà role cấp ở server-level (Chi mất MANAGE_STUDY_ROOMS)',
    member: chi,
    channel: voice(ow.everyone(0n, P.MANAGE_STUDY_ROOMS)),
    expected: DEFAULTS,
  }),

  // Role overwrites
  c({
    name: 'Role deny thắng @everyone allow (overwrite role áp sau @everyone)',
    member: chi,
    channel: text(
      ow.everyone(P.MENTION_EVERYONE, 0n),
      ow.role(ID.dieuPhoi, 0n, P.MENTION_EVERYONE),
    ),
    expected: DEFAULTS | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'Cùng kênh đó, Dũng không có role vẫn nhận @everyone allow',
    member: dung,
    channel: text(
      ow.everyone(P.MENTION_EVERYONE, 0n),
      ow.role(ID.dieuPhoi, 0n, P.MENTION_EVERYONE),
    ),
    expected: DEFAULTS | P.MENTION_EVERYONE,
  }),
  c({
    name: 'Role deny SEND_MESSAGES, không có allow → mất SEND_MESSAGES và quyền kèm theo',
    member: chi,
    channel: text(ow.role(ID.dieuPhoi, 0n, P.SEND_MESSAGES)),
    expected: without(DEFAULTS, ...NO_SEND_TEXT) | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'ROLE-03 AC2: Điều phối deny, Trưởng nhóm allow SEND_MESSAGES, member có cả hai → gửi được',
    member: { userId: ID.dung, roleIds: [ID.dieuPhoi, ID.truongNhom] },
    channel: text(
      ow.role(ID.dieuPhoi, 0n, P.SEND_MESSAGES),
      ow.role(ID.truongNhom, P.SEND_MESSAGES, 0n),
    ),
    expected: DEFAULTS | LEADER,
  }),
  c({
    name: 'Allow của role thấp vẫn thắng deny của role cao (gộp không theo thứ bậc)',
    member: { userId: ID.dung, roleIds: [ID.dieuPhoi, ID.truongNhom] },
    channel: text(
      ow.role(ID.truongNhom, 0n, P.SEND_MESSAGES),
      ow.role(ID.dieuPhoi, P.SEND_MESSAGES, 0n),
    ),
    expected: DEFAULTS | LEADER,
  }),
  c({
    name: 'Overwrite của role mà member không có bị bỏ qua',
    member: dung,
    channel: text(ow.role(ID.truongNhom, 0n, P.SEND_MESSAGES)),
    expected: DEFAULTS,
  }),

  // Member overwrites
  c({
    name: 'ROLE-03 AC1: Điều phối deny SEND_MESSAGES, overwrite member Chi allow → Chi gửi được',
    member: chi,
    channel: text(
      ow.role(ID.dieuPhoi, 0n, P.SEND_MESSAGES),
      ow.member(ID.chi, P.SEND_MESSAGES, 0n),
    ),
    expected: DEFAULTS | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'Overwrite member deny thắng allow của role',
    member: binh,
    channel: text(
      ow.role(ID.truongNhom, P.SEND_MESSAGES, 0n),
      ow.member(ID.binh, 0n, P.SEND_MESSAGES),
    ),
    expected: without(DEFAULTS, ...NO_SEND_TEXT) | LEADER,
  }),
  c({
    name: 'Overwrite member deny VIEW_CHANNEL → mất mọi quyền trong kênh',
    member: binh,
    channel: text(ow.member(ID.binh, 0n, P.VIEW_CHANNEL)),
    expected: 0n,
  }),
  c({
    name: 'Overwrite member của người khác bị bỏ qua',
    member: dung,
    channel: text(ow.member(ID.binh, 0n, P.VIEW_CHANNEL)),
    expected: DEFAULTS,
  }),

  // Private channels / missing VIEW_CHANNEL (REQ-ROLE-03 AC3)
  c({
    name: 'ROLE-03 AC3: #ban-quan-tri, Dũng không có role được xem → không có quyền',
    member: dung,
    channel: BAN_QUAN_TRI,
    expected: 0n,
  }),
  c({
    name: '#ban-quan-tri: Trưởng nhóm allow VIEW_CHANNEL → Bình thấy kênh',
    member: binh,
    channel: BAN_QUAN_TRI,
    expected: DEFAULTS | LEADER,
  }),
  c({
    name: 'Kênh riêng tư: overwrite member allow VIEW_CHANNEL → Dũng thấy kênh',
    member: dung,
    channel: text(
      ow.everyone(0n, P.VIEW_CHANNEL),
      ow.member(ID.dung, P.VIEW_CHANNEL, 0n),
    ),
    expected: DEFAULTS,
  }),
  c({
    name: '@everyone không có VIEW_CHANNEL ở server-level, không overwrite → không có quyền trong kênh',
    server: world({ everyone: without(DEFAULTS, 'VIEW_CHANNEL') }),
    member: dung,
    channel: text(),
    expected: 0n,
  }),
  c({
    name: '@everyone không có VIEW_CHANNEL, role của Chi cấp VIEW_CHANNEL → Chi thấy kênh',
    server: world({
      everyone: without(DEFAULTS, 'VIEW_CHANNEL'),
      dieuPhoi: P.MANAGE_STUDY_ROOMS | P.VIEW_CHANNEL,
    }),
    member: chi,
    channel: text(),
    expected: DEFAULTS | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: '@everyone không có VIEW_CHANNEL, kênh có @everyone allow VIEW_CHANNEL → thấy kênh',
    server: world({ everyone: without(DEFAULTS, 'VIEW_CHANNEL') }),
    member: dung,
    channel: text(ow.everyone(P.VIEW_CHANNEL, 0n)),
    expected: DEFAULTS,
  }),

  // Implicit permissions (8.5.2 step 4)
  c({
    name: 'Kênh text: mất SEND_MESSAGES thì mất cả MENTION_EVERYONE do role cấp',
    server: world({ dieuPhoi: P.MANAGE_STUDY_ROOMS | P.MENTION_EVERYONE }),
    member: chi,
    channel: THONG_BAO,
    expected: without(DEFAULTS, ...NO_SEND_TEXT) | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'Kênh text: deny CONNECT không kéo theo SPEAK, VIDEO (luật đó chỉ cho voice)',
    member: dung,
    channel: text(ow.everyone(0n, P.CONNECT)),
    expected: without(DEFAULTS, 'CONNECT'),
  }),
  c({
    name: 'Kênh voice không overwrite (Phòng học im lặng): Dũng giữ CONNECT, SPEAK, VIDEO',
    member: dung,
    channel: voice(),
    expected: DEFAULTS,
  }),
  c({
    name: 'Kênh voice: @everyone deny CONNECT → mất SPEAK, VIDEO',
    member: dung,
    channel: voice(ow.everyone(0n, P.CONNECT)),
    expected: without(DEFAULTS, 'CONNECT', 'SPEAK', 'VIDEO'),
  }),
  c({
    name: 'Kênh voice: thiếu CONNECT thì mất cả MUTE_MEMBERS, DEAFEN_MEMBERS, MOVE_MEMBERS',
    server: world({
      dieuPhoi: permissionBits(
        'MANAGE_STUDY_ROOMS',
        'MUTE_MEMBERS',
        'DEAFEN_MEMBERS',
        'MOVE_MEMBERS',
      ),
    }),
    member: chi,
    channel: voice(ow.role(ID.dieuPhoi, 0n, P.CONNECT)),
    expected:
      without(DEFAULTS, 'CONNECT', 'SPEAK', 'VIDEO') | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'Kênh voice: deny SEND_MESSAGES không kéo theo ATTACH_FILES, EMBED_LINKS',
    member: dung,
    channel: voice(ow.everyone(0n, P.SEND_MESSAGES)),
    expected: without(DEFAULTS, 'SEND_MESSAGES'),
  }),
  c({
    name: 'Kênh voice: role allow CONNECT bù lại @everyone deny',
    member: chi,
    channel: voice(
      ow.everyone(0n, P.CONNECT),
      ow.role(ID.dieuPhoi, P.CONNECT, 0n),
    ),
    expected: DEFAULTS | P.MANAGE_STUDY_ROOMS,
  }),
  c({
    name: 'Danh mục: không áp quyền ngầm định của text / voice',
    member: dung,
    channel: category(ow.everyone(0n, P.SEND_MESSAGES | P.CONNECT)),
    expected: without(DEFAULTS, 'SEND_MESSAGES', 'CONNECT'),
  }),
  c({
    name: 'Danh mục: thiếu VIEW_CHANNEL → không có quyền',
    member: dung,
    channel: category(ow.everyone(0n, P.VIEW_CHANNEL)),
    expected: 0n,
  }),

  // Timeout (REQ-ROLE-05, 8.5.2 step 5)
  c({
    name: 'Timeout: Dũng bị tạm khóa chỉ còn VIEW_CHANNEL ở #hoi-dap',
    member: timedOut(dung),
    channel: text(),
    expected: P.VIEW_CHANNEL,
  }),
  c({
    name: 'Timeout ở kênh voice: chỉ còn VIEW_CHANNEL (không vào phòng được)',
    member: timedOut(dung),
    channel: voice(),
    expected: P.VIEW_CHANNEL,
  }),
  c({
    name: 'Timeout đã hết trước thời điểm kiểm tra → quyền bình thường',
    member: timedOut(dung, minutesFromNow(-1)),
    channel: text(),
    expected: DEFAULTS,
  }),
  c({
    name: 'Timeout hết đúng thời điểm kiểm tra → không còn bị tạm khóa',
    member: timedOut(dung, NOW),
    channel: text(),
    expected: DEFAULTS,
  }),
  c({
    name: 'Timeout ở kênh không thấy được → không có quyền',
    member: timedOut(dung),
    channel: BAN_QUAN_TRI,
    expected: 0n,
  }),
  c({
    name: 'Timeout thắng overwrite allow: Bình bị tạm khóa ở #thong-bao chỉ còn VIEW_CHANNEL',
    member: timedOut(binh),
    channel: THONG_BAO_LEADERS_POST,
    expected: P.VIEW_CHANNEL,
  }),
  c({
    name: 'Administrator có hạn tạm khóa (dữ liệu cũ) vẫn có mọi quyền, nên không tạm khóa được họ (CR-28 #18)',
    member: timedOut(tuan),
    channel: text(),
    expected: ALL_PERMISSIONS,
  }),

  // Category sync (REQ-ROLE-03)
  c({
    name: 'Kênh đồng bộ với danh mục THÔNG TIN dùng overwrite của danh mục',
    member: dung,
    channel: synced('text', THONG_TIN),
    expected: without(DEFAULTS, ...NO_SEND_TEXT),
  }),
  c({
    name: 'Kênh đồng bộ: overwrite riêng còn lại của kênh bị bỏ qua',
    member: dung,
    channel: synced('text', THONG_TIN, [
      ow.everyone(P.SEND_MESSAGES | P.MENTION_EVERYONE, 0n),
    ]),
    expected: without(DEFAULTS, ...NO_SEND_TEXT),
  }),
  c({
    name: 'Kênh đã tắt đồng bộ dùng overwrite riêng, bỏ qua danh mục',
    member: dung,
    channel: {
      type: 'text',
      overwrites: [],
      permissionsSynced: false,
      parent: { overwrites: THONG_TIN },
    },
    expected: DEFAULTS,
  }),
  c({
    name: 'Danh mục riêng tư: kênh đồng bộ ẩn với Dũng (không có role được xem)',
    member: dung,
    channel: synced('text', PRIVATE_CATEGORY),
    expected: 0n,
  }),
  c({
    name: 'Danh mục riêng tư: Trưởng nhóm (Bình) thấy kênh đồng bộ',
    member: binh,
    channel: synced('text', PRIVATE_CATEGORY),
    expected: DEFAULTS | LEADER,
  }),
  c({
    name: 'Danh mục riêng tư: Administrator (Tuấn) thấy kênh đồng bộ',
    member: tuan,
    channel: synced('voice', PRIVATE_CATEGORY),
    expected: ALL_PERMISSIONS,
  }),
  c({
    name: 'Overwrite member ở danh mục áp cho kênh voice đồng bộ',
    member: dung,
    channel: synced('voice', [ow.member(ID.dung, 0n, P.SEND_MESSAGES)]),
    expected: without(DEFAULTS, 'SEND_MESSAGES'),
  }),
];

type HierarchyInput = Omit<HierarchyBase, 'server'> &
  Partial<Pick<HierarchyBase, 'server'>> &
  HierarchyCheck;
const h = (input: HierarchyInput): HierarchyCase => ({
  server: SERVER,
  ...input,
});

// Hierarchy (SRS 8.5.2 › Hierarchy; REQ-ROLE-01, 04, 05).
export const HIERARCHY_MATRIX: readonly HierarchyCase[] = [
  h({
    name: 'ROLE-01 AC3: Owner sửa được role cao nhất (Quản trị)',
    actor: an,
    check: 'role',
    role: ROLE[ID.quanTri]!,
    expected: true,
  }),
  h({
    name: 'Trưởng nhóm (Bình) sửa được Điều phối phòng học (thấp hơn)',
    actor: binh,
    check: 'role',
    role: ROLE[ID.dieuPhoi]!,
    expected: true,
  }),
  h({
    name: 'Trưởng nhóm không sửa được role ngang mình',
    actor: binh,
    check: 'role',
    role: ROLE[ID.truongNhom]!,
    expected: false,
  }),
  h({
    name: 'Trưởng nhóm không sửa được Quản trị (cao hơn)',
    actor: binh,
    check: 'role',
    role: ROLE[ID.quanTri]!,
    expected: false,
  }),
  h({
    name: 'ROLE-01 AC1: Điều phối mang ADMINISTRATOR vẫn không sửa được Trưởng nhóm',
    server: world({ dieuPhoi: P.ADMINISTRATOR }),
    actor: chi,
    check: 'role',
    role: ROLE[ID.truongNhom]!,
    expected: false,
  }),
  h({
    name: 'Member không role (Dũng) không sửa được cả @everyone',
    actor: dung,
    check: 'role',
    role: ROLE[ID.server]!,
    expected: false,
  }),
  h({
    name: 'Trưởng nhóm (Bình) tác động được Chi (Điều phối)',
    actor: binh,
    check: 'member',
    target: chi,
    expected: true,
  }),
  h({
    name: 'Chi không tác động được Bình (role cao hơn)',
    actor: chi,
    check: 'member',
    target: binh,
    expected: false,
  }),
  h({
    name: 'ROLE-05: Bình không tác động được người có role ngang mình',
    actor: binh,
    check: 'member',
    target: { userId: ID.dung, roleIds: [ID.truongNhom] },
    expected: false,
  }),
  h({
    name: 'ROLE-05: không ai tác động được Owner, kể cả Quản trị',
    actor: tuan,
    check: 'member',
    target: an,
    expected: false,
  }),
  h({
    name: 'Owner tác động được Quản trị',
    actor: an,
    check: 'member',
    target: tuan,
    expected: true,
  }),
  h({
    name: 'Member không role không tác động được member không role',
    actor: dung,
    check: 'member',
    target: khanh,
    expected: false,
  }),
  h({
    name: 'Thứ bậc theo role cao nhất: Dũng có Điều phối + Quản trị tác động được Bình',
    actor: { userId: ID.dung, roleIds: [ID.dieuPhoi, ID.quanTri] },
    check: 'member',
    target: binh,
    expected: true,
  }),
  h({
    name: 'Trưởng nhóm (Bình) tạm khóa được Chi (Điều phối)',
    actor: binh,
    check: 'timeout',
    target: chi,
    expected: true,
  }),
  h({
    name: 'CR-28 #18: Owner không tạm khóa được Quản trị (ADMINISTRATOR)',
    actor: an,
    check: 'timeout',
    target: tuan,
    expected: false,
  }),
  h({
    name: 'CR-28 #18: role thấp mang ADMINISTRATOR cũng không bị tạm khóa',
    server: world({ dieuPhoi: P.ADMINISTRATOR }),
    actor: binh,
    check: 'timeout',
    target: chi,
    expected: false,
  }),
  h({
    name: 'Không tạm khóa được người có role ngang mình',
    actor: binh,
    check: 'timeout',
    target: { userId: ID.dung, roleIds: [ID.truongNhom] },
    expected: false,
  }),
  h({
    name: 'ROLE-01 AC2: Trưởng nhóm không có BAN_MEMBERS thì không cấp được BAN_MEMBERS',
    actor: binh,
    check: 'grant',
    permissions: P.BAN_MEMBERS,
    expected: false,
  }),
  h({
    name: 'Trưởng nhóm cấp được quyền mình đang có',
    actor: binh,
    check: 'grant',
    permissions: P.MANAGE_MESSAGES | P.SEND_MESSAGES,
    expected: true,
  }),
  h({
    name: 'Cấp nhiều bit mà thiếu một bit → không cấp được',
    actor: binh,
    check: 'grant',
    permissions: P.MANAGE_MESSAGES | P.BAN_MEMBERS,
    expected: false,
  }),
  h({
    name: 'Administrator (Tuấn) cấp được mọi bit',
    actor: tuan,
    check: 'grant',
    permissions: ALL_PERMISSIONS,
    expected: true,
  }),
  h({
    name: 'Owner cấp được mọi bit',
    actor: { userId: ID.an, roleIds: [] },
    check: 'grant',
    permissions: ALL_PERMISSIONS,
    expected: true,
  }),
];
