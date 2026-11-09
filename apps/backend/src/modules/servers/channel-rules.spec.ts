import {
  describeDuplicate,
  duplicateNameMessage as sentence,
  type ChannelResponse,
} from '@nezfocus/shared';
import { ruleError } from './channel-rules.js';

const duplicateNameMessage = (
  channels: readonly ChannelResponse[],
  existing: ChannelResponse,
) => sentence(describeDuplicate(channels, existing));

const ch = (
  id: string,
  type: ChannelResponse['type'],
  name: string,
  parent_id: string | null,
): ChannelResponse => ({
  id,
  server_id: '1',
  type,
  name,
  parent_id,
  position: 0,
  focus_control: 'off',
  permissions_synced: true,
  permission_overwrites: [],
});

// "Ôn thi Giải tích 2" (02 › Dữ liệu mẫu), trimmed.
const INFO = ch('10', 'category', 'THÔNG TIN', null);
const server = [
  INFO,
  ch('12', 'text', 'tai-lieu', '10'),
  ch('20', 'category', 'Phòng học', null),
  ch('21', 'voice', 'Phòng học im lặng', '20'),
  ch('30', 'text', 'tai-lieu', null),
  ch('31', 'voice', 'Phòng chung', null),
];

describe('duplicateNameMessage (REQ-SRV-02 v1.9: the sentences of field name)', () => {
  it('a channel in a category names the category in capitals; voice is "phòng"', () => {
    expect(duplicateNameMessage(server, server[1]!)).toBe(
      'THÔNG TIN đã có kênh #tai-lieu',
    );
    expect(duplicateNameMessage(server, server[3]!)).toBe(
      'PHÒNG HỌC đã có phòng Phòng học im lặng',
    );
  });

  it('an uncategorized channel is "Trên cùng danh sách"; a category is server-wide', () => {
    expect(duplicateNameMessage(server, server[4]!)).toBe(
      'Trên cùng danh sách đã có kênh #tai-lieu',
    );
    expect(duplicateNameMessage(server, server[5]!)).toBe(
      'Trên cùng danh sách đã có phòng Phòng chung',
    );
    expect(duplicateNameMessage(server, INFO)).toBe(
      'Server đã có danh mục THÔNG TIN',
    );
  });
});

describe('ruleError (SRS 5.2: 40001 field errors)', () => {
  it('maps each rule to its field', () => {
    expect(ruleError({ ok: false, reason: 'not-a-category' })).toMatchObject({
      field: 'parent_id',
      code: 'NOT_A_CATEGORY',
    });
    expect(
      ruleError({ ok: false, reason: 'unknown-channel', id: '9' }),
    ).toMatchObject({ field: 'id', code: 'UNKNOWN_CHANNEL' });
    expect(
      ruleError({
        ok: false,
        reason: 'duplicate',
        duplicate: { kind: 'category', name: 'Thông tin' },
      }),
    ).toEqual({
      field: 'name',
      code: 'DUPLICATE_NAME',
      message: 'Server đã có danh mục THÔNG TIN',
    });
  });
});
