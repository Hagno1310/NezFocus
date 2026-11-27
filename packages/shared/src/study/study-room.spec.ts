import { CycleConfig } from './solo.contract.js';
import {
  CYCLE_PRESETS,
  DEFAULT_CYCLE_CONFIG,
  formatCycle,
  isStudyRoomSettingsOnly,
} from './study-room.js';

describe('CycleConfig for a Phòng học (REQ-STUDY-01, STUDY-11)', () => {
  it('STUDY-01 AC6: focus 200 minutes is out of range', () => {
    expect(
      CycleConfig.safeParse({ focus_min: 200, short_break_min: 5 }).success,
    ).toBe(false);
  });

  it('a long break every 1 focus is out of range (2–8)', () => {
    expect(
      CycleConfig.safeParse({
        focus_min: 45,
        short_break_min: 10,
        long_break_min: 20,
        long_break_every: 1,
      }).success,
    ).toBe(false);
  });

  it('presets are 25/5 and 50/10 without a long break; the room default is 25/5', () => {
    expect(CYCLE_PRESETS).toEqual({
      '25/5': { focus_min: 25, short_break_min: 5 },
      '50/10': { focus_min: 50, short_break_min: 10 },
    });
    expect(DEFAULT_CYCLE_CONFIG).toEqual({ focus_min: 25, short_break_min: 5 });
    for (const preset of Object.values(CYCLE_PRESETS))
      expect(CycleConfig.safeParse(preset).success).toBe(true);
  });
});

describe('formatCycle (spec 08 › Quy ước chung, as S-ROOM-03)', () => {
  it('no long break', () => {
    expect(formatCycle({ focus_min: 25, short_break_min: 5 }, 'vi')).toBe(
      '25/5 · không nghỉ dài',
    );
    expect(formatCycle({ focus_min: 25, short_break_min: 5 }, 'en')).toBe(
      '25/5 · no long break',
    );
  });

  it('with a long break', () => {
    const c = {
      focus_min: 45,
      short_break_min: 10,
      long_break_min: 20,
      long_break_every: 4,
    };
    expect(formatCycle(c, 'vi')).toBe('45/10 · nghỉ dài 20 sau mỗi 4 vòng');
    expect(formatCycle(c, 'en')).toBe('45/10 · long break 20 every 4 rounds');
  });

  it('the upper bounds (S-SET-EDGE long-cycle-360)', () => {
    expect(
      formatCycle(
        {
          focus_min: 120,
          short_break_min: 30,
          long_break_min: 60,
          long_break_every: 8,
        },
        'vi',
      ),
    ).toBe('120/30 · nghỉ dài 60 sau mỗi 8 vòng');
  });
});

describe('isStudyRoomSettingsOnly (REQ-STUDY-11 AC8)', () => {
  it('true when the body only touches the Phòng học fields', () => {
    expect(isStudyRoomSettingsOnly({ focus_control: 'managers' })).toBe(true);
    expect(
      isStudyRoomSettingsOnly({
        focus_control: 'off',
        default_cycle_config: { focus_min: 50, short_break_min: 10 },
      }),
    ).toBe(true);
  });

  it('false as soon as another channel field is in it', () => {
    expect(isStudyRoomSettingsOnly({ name: 'Phòng mới' })).toBe(false);
    expect(
      isStudyRoomSettingsOnly({ name: 'Phòng mới', focus_control: 'everyone' }),
    ).toBe(false);
    expect(isStudyRoomSettingsOnly({ permissions_synced: true })).toBe(false);
  });
});
