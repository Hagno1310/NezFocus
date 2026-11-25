import type { BlockQuery } from '../friends/block-query.js';
import type { SettingsService } from '../users/settings.service.js';
import { DbDmAccessPolicy } from './dm-access-policy.js';
import type { DmRepository } from './dm.repository.js';

const AN = 1n;
const BINH = 2n;
const DM = 50n;

const policy = ({
  status = 'active',
  blocked = false,
  friends = false,
  shared = [] as bigint[],
  acceptsFromMembers = true,
} = {}) =>
  new DbDmAccessPolicy(
    {
      recipients: async (id: bigint) => (id === DM ? [AN, BINH] : null),
      user: async () => ({ accountStatus: status }),
      areFriends: async () => friends,
      sharedServers: async () => shared.map((id) => ({ id })),
    } as unknown as DmRepository,
    { isBlockedEitherWay: async () => blocked } as unknown as BlockQuery,
    {
      acceptsDmFromServerMembers: async () => acceptsFromMembers,
    } as unknown as SettingsService,
  );

// REQ-DM-01..03, FRIEND-03 AC1 / AC3 (P2-B3.2 #115).
describe('DbDmAccessPolicy', () => {
  it('DM-01: friends may message; DM-02: so may people sharing a server', async () => {
    expect(await policy({ friends: true }).canMessage(AN, BINH)).toBe(true);
    expect(await policy({ shared: [7n] }).canMessage(AN, BINH)).toBe(true);
  });

  it('DM-02 AC1 / AC2 (âm): members-off, or no server and no friendship → false', async () => {
    expect(
      await policy({ shared: [7n], acceptsFromMembers: false }).canMessage(
        AN,
        BINH,
      ),
    ).toBe(false);
    expect(await policy().canMessage(AN, BINH)).toBe(false);
  });

  it('FRIEND-03 AC1 (âm): a block either way beats friendship', async () => {
    expect(
      await policy({ friends: true, blocked: true }).canMessage(AN, BINH),
    ).toBe(false);
  });

  it('nobody messages themselves or an account pending deletion', async () => {
    expect(await policy({ friends: true }).canMessage(AN, AN)).toBe(false);
    expect(
      await policy({ friends: true, status: 'pending_deletion' }).canMessage(
        AN,
        BINH,
      ),
    ).toBe(false);
  });

  it('canSend / canView only for the two people of the DM', async () => {
    const p = policy({ friends: true });
    expect(await p.canSend(AN, DM)).toBe(true);
    expect(await p.canSend(3n, DM)).toBe(false);
    expect(await p.canView(3n, DM)).toBe(false);
    expect(await p.canView(BINH, 99n)).toBe(false);
  });
});
