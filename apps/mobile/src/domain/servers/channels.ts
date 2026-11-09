import {
  CHANNEL_NAME_MAX,
  ErrorCode,
  applyPositions,
  byPosition,
  describeDuplicate,
  findDuplicateChannel,
  normalizeTextChannelName,
  type ChannelResponse,
  type ChannelType,
  type CreateChannelRequest,
  type DuplicateName,
  type UpdateChannelPositionsRequest,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import type { ChannelSection } from './drawer';
import type { ServerRepository } from './ServerRepository';

// REQ-SRV-02 on the app: S-SET-09 Tạo kênh, S-SET-06 Tổng quan, S-HOME-02 `reordering`.
// Names are checked on press with the shared rules, so a duplicate never reaches the
// backend; a 40001 the app could not foresee (a stale list) shows the backend's sentence.

// SRV-02 AC2: the "Sẽ lưu là # …" line, only when the saved name differs from the field.
export function namePreview(type: ChannelType, raw: string): string | null {
  if (type !== 'text') return null;
  const saved = normalizeTextChannelName(raw);
  return saved && saved !== raw ? saved : null;
}

export type ChannelNameError =
  | { kind: 'length' } // "Tên kênh cần 1–100 ký tự"
  | { kind: 'no-letter' } // AC9 "Tên kênh cần ít nhất một chữ cái hoặc chữ số"
  | { kind: 'duplicate'; duplicate: DuplicateName } // AC7, the sentence by kind
  | { kind: 'server'; message: string }; // 40001 name the app did not foresee

type Candidate = {
  id?: string;
  type: ChannelType;
  name: string;
  parent_id: string | null;
};

export function checkChannelName(
  channels: readonly ChannelResponse[],
  candidate: Candidate,
): { ok: true; name: string } | { ok: false; error: ChannelNameError } {
  const trimmed = candidate.name.trim();
  if (!trimmed || trimmed.length > CHANNEL_NAME_MAX)
    return { ok: false, error: { kind: 'length' } };
  const name =
    candidate.type === 'text' ? normalizeTextChannelName(trimmed) : trimmed;
  if (!name) return { ok: false, error: { kind: 'no-letter' } };
  const parent_id = candidate.type === 'category' ? null : candidate.parent_id;
  const existing = findDuplicateChannel(channels, {
    ...candidate,
    name,
    parent_id,
  });
  if (existing)
    return {
      ok: false,
      error: {
        kind: 'duplicate',
        duplicate: describeDuplicate(channels, existing),
      },
    };
  return { ok: true, name };
}

export type ChannelActionError =
  | ChannelNameError
  | { kind: 'limit' } // S-SET-09 `limit`: 500 channels
  | { kind: 'forbidden' } // 40302 / 40401: lost the permission, or the channel is gone
  | { kind: 'network' } // offline / failed
  | { kind: 'other' };

const errorOf = (err: unknown): ChannelActionError => {
  const e = asApiError(err);
  if (!e) return { kind: 'network' };
  if (e.code === ErrorCode.Forbidden || e.code === ErrorCode.NotFound)
    return { kind: 'forbidden' };
  if (e.code === ErrorCode.ValidationError) {
    const name = e.errors?.name?.[0];
    if (name) return { kind: 'server', message: name.message ?? '' };
    if (e.errors?._?.some((x) => x.code === 'MAX_CHANNELS'))
      return { kind: 'limit' };
  }
  return { kind: 'other' };
};

export type ChannelResult =
  | { ok: true; channel: ChannelResponse }
  | { ok: false; error: ChannelActionError };

export type CreateChannelForm = {
  type: ChannelType;
  name: string;
  parentId: string | null; // the "Danh mục" row; ignored for a category
  studyRoom: boolean; // v1.9 CR-22 "Bật phòng học", voice only
  viewerRoleIds?: string[]; // v1.9 CR-17 "Kênh riêng tư" on; not for a category
};

export async function createChannel(
  repo: Pick<ServerRepository, 'createChannel'>,
  serverId: string,
  channels: readonly ChannelResponse[],
  form: CreateChannelForm,
): Promise<ChannelResult> {
  const checked = checkChannelName(channels, {
    type: form.type,
    name: form.name,
    parent_id: form.parentId,
  });
  if (!checked.ok) return checked;
  const { name } = checked;
  const viewers = form.viewerRoleIds && {
    viewer_role_ids: form.viewerRoleIds,
  };
  const body: CreateChannelRequest =
    form.type === 'category'
      ? { type: 'category', name }
      : form.type === 'text'
        ? { type: 'text', name, parent_id: form.parentId, ...viewers }
        : {
            type: 'voice',
            name,
            parent_id: form.parentId,
            focus_control: form.studyRoom ? 'everyone' : 'off',
            ...viewers,
          };
  try {
    return { ok: true, channel: await repo.createChannel(serverId, body) };
  } catch (err) {
    return { ok: false, error: errorOf(err) };
  }
}

// S-SET-06 overview, and `category-rename`.
export async function renameChannel(
  repo: Pick<ServerRepository, 'updateChannel'>,
  channels: readonly ChannelResponse[],
  channel: ChannelResponse,
  raw: string,
): Promise<ChannelResult> {
  const checked = checkChannelName(channels, { ...channel, name: raw });
  if (!checked.ok) return checked;
  try {
    return {
      ok: true,
      channel: await repo.updateChannel(channel.id, { name: checked.name }),
    };
  } catch (err) {
    return { ok: false, error: errorOf(err) };
  }
}

// `delete-confirm`, `category-delete-confirm`.
export async function deleteChannel(
  repo: Pick<ServerRepository, 'deleteChannel'>,
  channelId: string,
): Promise<{ ok: true } | { ok: false; error: ChannelActionError }> {
  try {
    await repo.deleteChannel(channelId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorOf(err) };
  }
}

export type ReorderEntry =
  | { kind: 'header'; category: ChannelResponse }
  | { kind: 'channel'; channel: ChannelResponse };

// The drawer while one channel is dragged: headers and rows in order, minus that channel
// (null keeps every row).
export function reorderEntries(
  sections: readonly ChannelSection[],
  draggedId: string | null,
): ReorderEntry[] {
  return sections.flatMap(({ category, rows }) => [
    ...(category ? [{ kind: 'header' as const, category }] : []),
    ...rows
      .filter((c) => c.id !== draggedId)
      .map((channel) => ({ kind: 'channel' as const, channel })),
  ]);
}

export type DropTarget = { parentId: string | null; index: number };

// Inserting before entries[insertAt]: the nearest header above owns the slot; above the
// first header is the top group (CR-11, 22/10/2026).
export function dropTarget(
  entries: readonly ReorderEntry[],
  insertAt: number,
): DropTarget {
  let parentId: string | null = null;
  let index = 0;
  for (const entry of entries.slice(0, insertAt)) {
    if (entry.kind === 'header') {
      parentId = entry.category.id;
      index = 0;
    } else index++;
  }
  return { parentId, index };
}

export type DropPlan =
  | {
      ok: true;
      patch: UpdateChannelPositionsRequest; // empty: dropped where it was
      changed: ChannelResponse[];
    }
  | { ok: false; duplicate: DuplicateName };

// SRV-02 AC1: the target group renumbered 0…n-1 with the channel at `index`. Only what
// moved is sent; a name clash is `drop-blocked` and never reaches the API.
export function planDrop(
  channels: readonly ChannelResponse[],
  channelId: string,
  { parentId, index }: DropTarget,
): DropPlan {
  const group = channels
    .filter(
      (c) =>
        c.type !== 'category' && c.parent_id === parentId && c.id !== channelId,
    )
    .sort(byPosition);
  const moving = channels.find((c) => c.id === channelId);
  if (!moving) return { ok: true, patch: [], changed: [] };
  group.splice(index, 0, moving);
  const patch = group
    .map((c, position) => ({ id: c.id, position, parent_id: parentId }))
    .filter((p, i) => {
      const was = group[i]!;
      return was.position !== p.position || was.parent_id !== p.parent_id;
    });
  if (!patch.length) return { ok: true, patch: [], changed: [] };
  const result = applyPositions(channels, patch);
  if (result.ok) return { ok: true, patch, changed: result.changed };
  // Only a duplicate can fail here: the ids and the parent come from the list itself.
  if (result.reason === 'duplicate')
    return { ok: false, duplicate: result.duplicate };
  return { ok: true, patch: [], changed: [] };
}

export type MoveResult =
  | { ok: true }
  | { ok: false; error: 'duplicate'; duplicate: DuplicateName } // `drop-blocked`
  | { ok: false; error: 'failed'; retry: () => Promise<MoveResult> };

// SRV-02 AC1 on drop: the rows move at once (`apply`), then the save; a failed save puts
// back only the rows it moved, so Gateway updates that came meanwhile stay.
export async function moveChannel(
  repo: Pick<ServerRepository, 'setChannelPositions'>,
  serverId: string,
  channels: readonly ChannelResponse[],
  channelId: string,
  target: DropTarget,
  apply: (changed: readonly ChannelResponse[]) => void,
): Promise<MoveResult> {
  const plan = planDrop(channels, channelId, target);
  if (!plan.ok)
    return { ok: false, error: 'duplicate', duplicate: plan.duplicate };
  if (!plan.patch.length) return { ok: true };
  const previous = plan.changed.flatMap(
    (c) => channels.find((x) => x.id === c.id) ?? [],
  );
  const save = async (): Promise<MoveResult> => {
    apply(plan.changed);
    try {
      await repo.setChannelPositions(serverId, plan.patch);
      return { ok: true };
    } catch {
      apply(previous);
      return { ok: false, error: 'failed', retry: save };
    }
  };
  return save();
}
