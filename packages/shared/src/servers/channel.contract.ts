import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';
import { CHANNEL_NAME_MAX, normalizeTextChannelName } from './channel-names.js';

// Paths are relative to /api/v1 (SRS 5.3 Server). The caller only sees channels it may view.
export const ChannelRoutes = {
  // REQ-SRV-02 · GET: 40401 · POST: 40001 (field name: empty or duplicate), 40302 (MANAGE_CHANNELS), 40401
  list: '/servers/:id/channels',
  // REQ-SRV-02 AC1 · 204 · 40001 (duplicate name in the new group), 40302, 40401
  positions: '/servers/:id/channels/positions',
  // REQ-SRV-02 · PATCH: 40001, 40302, 40401 · DELETE: 204, 40302, 40401
  byId: '/channels/:id',
} as const;

// SRS 8.2 channels.type 0–2 (DMs come with their own area).
export const ChannelType = z.enum(['category', 'text', 'voice']);
export type ChannelType = z.infer<typeof ChannelType>;

// REQ-STUDY-11: anything but `off` makes a voice channel a Phòng học. Non-voice channels are `off`.
export const FocusControl = z.enum(['everyone', 'managers', 'off']);
export type FocusControl = z.infer<typeof FocusControl>;

export const ChannelResponse = z.object({
  id: SnowflakeId,
  server_id: SnowflakeId,
  type: ChannelType,
  name: z.string(),
  parent_id: SnowflakeId.nullable(), // null = top of the list, no category (v1.8)
  position: z.number().int(),
  focus_control: FocusControl,
  permissions_synced: z.boolean(), // REQ-ROLE-03: follows the category's overwrites
});
export type ChannelResponse = z.infer<typeof ChannelResponse>;

export const ChannelListResponse = z.array(ChannelResponse);
export type ChannelListResponse = z.infer<typeof ChannelListResponse>;

// Voice channels and categories: free text, 1–100 characters.
export const FreeChannelName = z.string().trim().min(1).max(CHANNEL_NAME_MAX);

// REQ-SRV-02: at most 500 channels (categories included) per server → 40001 code MAX_CHANNELS.
export const MAX_CHANNELS_PER_SERVER = 500;

// REQ-SRV-02 AC9, also sent back when a rename normalizes to nothing.
export const NO_LETTER_OR_DIGIT_MESSAGE =
  'Tên kênh cần ít nhất một chữ cái hoặc chữ số';

// Text channels are saved normalized (REQ-SRV-02); "???" → 40001 code NO_LETTER_OR_DIGIT.
export const TextChannelName = z
  .string()
  .transform(normalizeTextChannelName)
  .superRefine((name, ctx) => {
    if (!name)
      ctx.addIssue({
        code: 'custom',
        message: NO_LETTER_OR_DIGIT_MESSAGE,
        params: { code: 'NO_LETTER_OR_DIGIT' },
      });
  })
  .pipe(z.string().max(CHANNEL_NAME_MAX));

const parent_id = SnowflakeId.nullable().default(null);
// v1.9 CR-17: a private channel at creation; roles other than these lose VIEW_CHANNEL.
const viewer_role_ids = z.array(SnowflakeId).max(250).optional(); // REQ-ROLE-01: ≤ 250 roles

export const CreateChannelRequest = z.discriminatedUnion('type', [
  z.object({ type: z.literal('category'), name: FreeChannelName }),
  z.object({
    type: z.literal('text'),
    name: TextChannelName,
    parent_id,
    viewer_role_ids,
  }),
  z.object({
    type: z.literal('voice'),
    name: FreeChannelName,
    parent_id,
    // v1.9 CR-22 "Bật phòng học"; missing → everyone in a Study Server, off elsewhere
    focus_control: z.enum(['everyone', 'off']).optional(),
    viewer_role_ids,
  }),
]);
export type CreateChannelRequest = z.infer<typeof CreateChannelRequest>;

// The backend normalizes the name when the channel is a text channel. The Phòng học settings
// (focus_control, default_cycle_config) join this body with REQ-STUDY-11's ticket.
export const UpdateChannelRequest = z.object({ name: FreeChannelName });
export type UpdateChannelRequest = z.infer<typeof UpdateChannelRequest>;

export const UpdateChannelPositionsRequest = z
  .array(
    z.object({
      id: SnowflakeId,
      position: z.number().int().min(0),
      parent_id: SnowflakeId.nullable(),
    }),
  )
  .min(1);
export type UpdateChannelPositionsRequest = z.infer<
  typeof UpdateChannelPositionsRequest
>;

export const ChannelDeleted = z.object({
  id: SnowflakeId,
  server_id: SnowflakeId,
});
export type ChannelDeleted = z.infer<typeof ChannelDeleted>;
