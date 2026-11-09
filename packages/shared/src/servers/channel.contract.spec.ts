import { UpdateChannelRequest } from './channel.contract.js';

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
});
