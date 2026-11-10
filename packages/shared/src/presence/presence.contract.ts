import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';
import { FocusPhase, SoloStatus } from '../study/solo.contract.js';

// REQ-AUTH-05: the status the user picks (user_settings.preferred_status).
export const PresenceStatus = z.enum(['online', 'idle', 'dnd', 'invisible']);
export type PresenceStatus = z.infer<typeof PresenceStatus>;

// What others see: Invisible reaches them as offline (AUTH-05 AC2).
export const VisibleStatus = z.enum(['online', 'idle', 'dnd', 'offline']);
export type VisibleStatus = z.infer<typeof VisibleStatus>;

// SRS 5.4 op 3 (chốt 10/11/2026): afk = no touch for 10 min (AUTH-05 AC1), so auto Vắng mặt never overwrites the manual status.
export const PresenceUpdate = z.object({
  status: PresenceStatus,
  afk: z.boolean().default(false),
});
export type PresenceUpdate = z.infer<typeof PresenceUpdate>;

// REQ-AUTH-05 CR-24. Room details only reach people with VIEW_CHANNEL on it; others get room = null.
export const StudyActivity = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('solo'),
    phase: FocusPhase,
    state: SoloStatus.exclude(['ended']),
    phase_ends_at: z.iso.datetime().nullable(), // running only
  }),
  z.object({
    kind: z.literal('group_study'), // a room with a Room Session (P3-B3)
    room: z
      .object({
        channel_id: SnowflakeId,
        channel_name: z.string(),
        phase: FocusPhase,
        state: z.enum(['running', 'paused']),
        phase_ends_at: z.iso.datetime().nullable(), // running only
      })
      .nullable(),
  }),
  z.object({
    kind: z.literal('voice'), // a voice channel or a Phòng học without a session (P3-B1)
    room: z
      .object({
        channel_id: SnowflakeId,
        channel_name: z.string(),
        study_room: z.boolean(), // icon lamp-desk, else volume-2 (C-40)
      })
      .nullable(),
  }),
]);
export type StudyActivity = z.infer<typeof StudyActivity>;

// activity null also when the user is Invisible or turned off "Hiện hoạt động học" (AUTH-05 AC5).
export const PresenceEvent = z.object({
  user_id: SnowflakeId,
  status: VisibleStatus,
  activity: StudyActivity.nullable(),
});
export type PresenceEvent = z.infer<typeof PresenceEvent>;
