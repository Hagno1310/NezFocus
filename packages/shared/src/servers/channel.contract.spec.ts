import {
  ChannelUpdateEvent,
  UpdateChannelRequest,
} from './channel.contract.js';

describe('UpdateChannelRequest (REQ-SRV-02 rename, REQ-ROLE-03 v1.7 sync toggle)', () => {
  it('takes a name, the sync switch, or both; never nothing', () => {
    expect(UpdateChannelRequest.parse({ name: ' chung ' })).toEqual({
      name: 'chung',
    });
    expect(UpdateChannelRequest.parse({ permissions_synced: false })).toEqual({
      permissions_synced: false,
    });
    expect(
      UpdateChannelRequest.safeParse({ name: 'a', permissions_synced: true })
        .success,
    ).toBe(true);
    expect(UpdateChannelRequest.safeParse({}).success).toBe(false);
  });

  it('REQ-STUDY-11: takes focus_control and default_cycle_config alone', () => {
    expect(UpdateChannelRequest.parse({ focus_control: 'managers' })).toEqual({
      focus_control: 'managers',
    });
    const cycle = {
      focus_min: 45,
      short_break_min: 10,
      long_break_min: 20,
      long_break_every: 4,
    };
    expect(UpdateChannelRequest.parse({ default_cycle_config: cycle })).toEqual(
      { default_cycle_config: cycle },
    );
  });

  it('STUDY-01 AC6: a default cycle out of range is refused (40001 at the backend)', () => {
    const r = UpdateChannelRequest.safeParse({
      default_cycle_config: { focus_min: 200, short_break_min: 5 },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual([
      'default_cycle_config',
      'focus_min',
    ]);
    expect(
      UpdateChannelRequest.safeParse({ focus_control: 'sometimes' }).success,
    ).toBe(false);
  });
});

describe('CHANNEL_UPDATE (CR-28 #37)', () => {
  const channel = {
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

  it('names who changed it, null when a reorder moved it', () => {
    expect(
      ChannelUpdateEvent.parse({ ...channel, updated_by: '2' }).updated_by,
    ).toBe('2');
    expect(
      ChannelUpdateEvent.parse({ ...channel, updated_by: null }).updated_by,
    ).toBeNull();
  });

  it('a text channel has no default cycle', () => {
    expect(
      ChannelUpdateEvent.safeParse({
        ...channel,
        type: 'text',
        focus_control: 'off',
        default_cycle_config: null,
        updated_by: null,
      }).success,
    ).toBe(true);
  });
});
