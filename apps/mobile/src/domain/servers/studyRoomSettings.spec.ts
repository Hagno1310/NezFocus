import {
  ErrorCode,
  type ChannelResponse,
  type ChannelUpdateEvent,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../data/api/client';
import {
  changedByOther,
  needsOffConfirm,
  saveStudyRoom,
  studyRoomView,
} from './studyRoomSettings';

// "Phòng học im lặng" (spec 08 › Dữ liệu nhất quán): everyone, 25/5, 9 people, An hosts.
const room: ChannelResponse = {
  id: '11',
  server_id: '10',
  type: 'voice',
  name: 'Phòng học im lặng',
  parent_id: null,
  position: 0,
  focus_control: 'everyone',
  default_cycle_config: { focus_min: 25, short_break_min: 5 },
  permissions_synced: true,
  permission_overwrites: [],
  last_message_id: null,
};
const AN = '1';
const BINH = '2';
const session = { participants: 9, host_id: AN };

describe('studyRoomView (S-SET-07 states)', () => {
  it('full-access: the session line, no note, the cycle group', () => {
    expect(studyRoomView(room, session, AN)).toEqual({
      sessionPeople: 9,
      note: null,
      showCycle: true,
    });
  });

  it('managers while a session runs: the Host keeps control (STUDY-11)', () => {
    const managers = { ...room, focus_control: 'managers' as const };
    expect(studyRoomView(managers, session, AN).note).toBe('hostKeeps');
    // CR-28 #37: someone who is not the Host reads the general sentence.
    expect(studyRoomView(managers, session, BINH).note).toBe('controllerKeeps');
    expect(studyRoomView(managers, null, AN).note).toBeNull();
  });

  it('off: no session line, no cycle group, the off note', () => {
    expect(studyRoomView({ ...room, focus_control: 'off' }, null, AN)).toEqual({
      sessionPeople: null,
      note: 'off',
      showCycle: false,
    });
  });
});

describe('needsOffConfirm (switch-off-confirm)', () => {
  it('asks only when turning a running Phòng học off', () => {
    expect(needsOffConfirm('everyone', 'off', session)).toBe(true);
    expect(needsOffConfirm('managers', 'off', session)).toBe(true);
    expect(needsOffConfirm('everyone', 'off', null)).toBe(false);
    expect(needsOffConfirm('everyone', 'managers', session)).toBe(false);
    expect(needsOffConfirm('off', 'off', session)).toBe(false);
  });
});

describe('saveStudyRoom', () => {
  it('returns the saved channel', async () => {
    const saved = { ...room, focus_control: 'managers' as const };
    const sent: unknown[] = [];
    const r = await saveStudyRoom(
      {
        updateChannel: async (_id, body) => {
          sent.push(body);
          return saved;
        },
      },
      room.id,
      { focus_control: 'managers' },
    );
    expect(sent).toEqual([{ focus_control: 'managers' }]);
    expect(r).toEqual({ ok: true, channel: saved });
  });

  it('40302 means the permission is gone (Edge case: the screen closes)', async () => {
    const r = await saveStudyRoom(
      {
        updateChannel: () =>
          Promise.reject(
            new ApiError(403, { code: ErrorCode.Forbidden, message: 'no' }),
          ),
      },
      room.id,
      { focus_control: 'off' },
    );
    expect(r).toEqual({ ok: false, error: 'lost' });
  });

  it('anything else is save-error (old value back, Toast "Thử lại")', async () => {
    const r = await saveStudyRoom(
      { updateChannel: () => Promise.reject(new Error('offline')) },
      room.id,
      { focus_control: 'off' },
    );
    expect(r).toEqual({ ok: false, error: 'failed' });
  });
});

describe('changedByOther (S-SET-EDGE changed-by-other)', () => {
  const event = (
    changes: Partial<ChannelUpdateEvent>,
    updated_by: string | null,
  ): ChannelUpdateEvent => ({ ...room, ...changes, updated_by });

  it('names who changed a Phòng học setting', () => {
    expect(
      changedByOther(room, event({ focus_control: 'managers' }, BINH), AN),
    ).toBe(BINH);
    expect(
      changedByOther(
        room,
        event(
          { default_cycle_config: { focus_min: 50, short_break_min: 10 } },
          BINH,
        ),
        AN,
      ),
    ).toBe(BINH);
  });

  it('no Toast for my own save, a rename, or a reorder', () => {
    expect(
      changedByOther(room, event({ focus_control: 'managers' }, AN), AN),
    ).toBeNull();
    expect(
      changedByOther(room, event({ name: 'Phòng tối' }, BINH), AN),
    ).toBeNull();
    expect(
      changedByOther(room, event({ focus_control: 'managers' }, null), AN),
    ).toBeNull();
  });
});
