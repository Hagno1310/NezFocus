import { describe, expect, it } from 'vitest';
import {
  bannerServerName,
  createPendingInvites,
  type PendingInviteStorage,
} from './pendingInvite';

const NOW = new Date('2026-10-18T13:12:00Z');
const HOUR = 3_600_000;

function memoryStorage(raw: string | null = null) {
  const box = { raw };
  const storage: PendingInviteStorage = {
    load: async () => box.raw,
    save: async (value) => {
      box.raw = value;
    },
    clear: async () => {
      box.raw = null;
    },
  };
  return { box, storage };
}

const invite = { code: 'k7Qm2xPa', serverName: 'Ôn thi Giải tích 2' };

describe('lời mời đang chờ (REQ-SRV-07 v1.2)', () => {
  it('AC4: kept on the phone, and still there after the app is killed', async () => {
    const { box, storage } = memoryStorage();
    await createPendingInvites(storage, () => NOW).keep(invite);
    // The app is killed: a new run reads it back.
    const next = createPendingInvites(storage, () => NOW);
    await next.restore();
    expect(next.current()).toMatchObject(invite);
    expect(box.raw).not.toBeNull();
  });

  it('AC5: older than 24 hours → dropped and forgotten', async () => {
    let now = NOW;
    const { box, storage } = memoryStorage();
    await createPendingInvites(storage, () => now).keep(invite);
    now = new Date(NOW.getTime() + 24 * HOUR + 1);
    const later = createPendingInvites(storage, () => now);
    await later.restore();
    expect(later.current()).toBeNull();
    expect(box.raw).toBeNull();
  });

  it('only one: a second invite replaces the first', async () => {
    const { storage } = memoryStorage();
    const pending = createPendingInvites(storage, () => NOW);
    await pending.keep(invite);
    await pending.keep({
      code: 'Xs7Lp3Qd',
      serverName: 'Ôn thi XSTK',
      channel: '7',
    });
    expect(pending.current()).toMatchObject({ code: 'Xs7Lp3Qd', channel: '7' });
  });

  it('drop(code) forgets it only when it is that invite', async () => {
    const { storage } = memoryStorage();
    const pending = createPendingInvites(storage, () => NOW);
    await pending.keep(invite);
    await pending.drop('Xs7Lp3Qd');
    expect(pending.current()).not.toBeNull();
    await pending.drop('k7Qm2xPa');
    expect(pending.current()).toBeNull();
  });

  it('ignores what it cannot read', async () => {
    const { storage } = memoryStorage('{not json');
    const pending = createPendingInvites(storage, () => NOW);
    await pending.restore();
    expect(pending.current()).toBeNull();
  });
});

describe('bannerServerName (spec 01 long-server-name)', () => {
  it('40 characters, cut at a word boundary, then "…"', () => {
    expect(
      bannerServerName(
        'Ôn thi cuối kỳ Giải tích 2 — Nhóm học buổi tối K22 khoa CNTT',
      ),
    ).toBe('Ôn thi cuối kỳ Giải tích 2 — Nhóm học…');
    expect(bannerServerName('Ôn thi Giải tích 2')).toBe('Ôn thi Giải tích 2');
  });
});
