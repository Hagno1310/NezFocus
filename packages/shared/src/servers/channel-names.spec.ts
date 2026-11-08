import {
  channelNameKey,
  findDuplicateChannel,
  normalizeTextChannelName,
} from './channel-names.js';

describe('normalizeTextChannelName (REQ-SRV-02 quy tắc tên)', () => {
  it('AC2: "Hỏi Đáp Chung" is saved as hỏi-đáp-chung', () => {
    expect(normalizeTextChannelName('Hỏi Đáp Chung')).toBe('hỏi-đáp-chung');
  });

  it('AC9: "???" has nothing left', () => {
    expect(normalizeTextChannelName('???')).toBe('');
  });

  it('keeps digits, - and _; drops other symbols; merges and trims -', () => {
    expect(normalizeTextChannelName('  --Tài liệu  #1 (cũ)_v2--  ')).toBe(
      'tài-liệu-1-cũ_v2',
    );
  });

  it('keeps the accents of decomposed input', () => {
    expect(normalizeTextChannelName('Hồi'.normalize('NFD'))).toBe('hồi');
  });
});

describe('channelNameKey / findDuplicateChannel (REQ-SRV-02 không trùng tên)', () => {
  const siblings = [
    { id: '1', type: 'voice', name: 'Phòng Ôn', parent_id: '10' },
    { id: '2', type: 'text', name: 'hoi-dap', parent_id: '10' },
    { id: '3', type: 'text', name: 'bàn', parent_id: null },
    { id: '10', type: 'category', name: 'THÔNG TIN', parent_id: null },
  ] as const;

  it('AC3: a voice channel name keeps the words as typed', () => {
    expect(channelNameKey('voice', 'Phòng học im lặng')).toBe(
      'phòng học im lặng',
    );
  });

  it('AC7: phòng ôn clashes with Phòng Ôn in the same category', () => {
    expect(
      findDuplicateChannel(siblings, {
        type: 'voice',
        name: 'phòng ôn',
        parent_id: '10',
      }),
    ).toMatchObject({ id: '1' });
  });

  it('AC8: hỏi-đáp does not clash with hoi-dap', () => {
    expect(
      findDuplicateChannel(siblings, {
        type: 'text',
        name: 'hỏi-đáp',
        parent_id: '10',
      }),
    ).toBeNull();
  });

  it('"bàn" ≠ "bạn"', () => {
    expect(channelNameKey('text', 'bàn')).not.toBe(
      channelNameKey('text', 'bạn'),
    );
    expect(
      findDuplicateChannel(siblings, {
        type: 'text',
        name: 'bạn',
        parent_id: null,
      }),
    ).toBeNull();
  });

  it('compares text channels on the saved name', () => {
    expect(
      findDuplicateChannel(siblings, {
        type: 'text',
        name: 'Hoi Dap',
        parent_id: '10',
      }),
    ).toMatchObject({ id: '2' });
  });

  it('only channels of the same type in the same group clash', () => {
    expect(
      findDuplicateChannel(siblings, {
        type: 'text',
        name: 'Phòng Ôn',
        parent_id: '10',
      }),
    ).toBeNull();
    expect(
      findDuplicateChannel(siblings, {
        type: 'voice',
        name: 'Phòng Ôn',
        parent_id: null,
      }),
    ).toBeNull();
  });

  it('categories clash across the whole server', () => {
    expect(
      findDuplicateChannel(siblings, {
        type: 'category',
        name: 'thông tin',
        parent_id: null,
      }),
    ).toMatchObject({ id: '10' });
  });

  it('renaming a channel to its own name is not a clash', () => {
    expect(
      findDuplicateChannel(siblings, {
        id: '1',
        type: 'voice',
        name: 'PHÒNG ÔN',
        parent_id: '10',
      }),
    ).toBeNull();
  });
});
