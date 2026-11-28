import { describe, expect, it } from 'vitest';
import {
  BODY_MAX,
  messageBody,
  pushText,
  type PushNames,
} from './push-text.js';

const names: PushNames = {
  users: new Map([['1', 'An']]),
  roles: new Map([['5', 'Nhóm trưởng']]),
  channels: new Map([['9', 'hoi-dap']]),
};

describe('push text (REQ-NOTIF-02, SRS 5.6 CR-28 #36)', () => {
  it('names who mentioned me and where, in Vietnamese and English', () => {
    const mention = {
      type: 'mention' as const,
      actor: 'Bình',
      channel: 'viec-nhom',
      via: 'user' as const,
      body: '@An họp lúc 9h',
    };
    expect(pushText(mention, 'vi')).toEqual({
      title: 'Bình nhắc tới bạn ở #viec-nhom',
      body: '@An họp lúc 9h',
    });
    expect(pushText(mention, 'en').title).toBe(
      'Bình mentioned you in #viec-nhom',
    );
  });

  it('says how I was mentioned: @everyone, @here, a role', () => {
    const base = {
      type: 'mention' as const,
      actor: 'Bình',
      channel: 'viec-nhom',
      body: 'x',
    };
    expect(pushText({ ...base, via: 'everyone' }, 'vi').title).toBe(
      'Bình nhắc tới @everyone ở #viec-nhom',
    );
    expect(pushText({ ...base, via: 'here' }, 'en').title).toBe(
      'Bình mentioned @here in #viec-nhom',
    );
    expect(
      pushText({ ...base, via: 'role', role: 'Nhóm trưởng' }, 'vi').title,
    ).toBe('Bình nhắc tới @Nhóm trưởng ở #viec-nhom');
  });

  it('writes a reply, a DM and a friend request', () => {
    expect(
      pushText(
        { type: 'reply', actor: 'Chi', channel: 'hoi-dap', body: 'ok' },
        'vi',
      ),
    ).toEqual({ title: 'Chi trả lời bạn ở #hoi-dap', body: 'ok' });
    expect(pushText({ type: 'dm', actor: 'Dũng', body: 'hi' }, 'en')).toEqual({
      title: 'Dũng',
      body: 'hi',
    });
    const request = {
      type: 'friend_request' as const,
      actor: 'Giang',
      username: 'giang.vo',
      note: 'Mình là Giang lớp K22',
    };
    expect(pushText(request, 'vi')).toEqual({
      title: 'Giang muốn kết bạn',
      body: 'Mình là Giang lớp K22',
    });
    expect(pushText({ ...request, note: null }, 'en')).toEqual({
      title: 'Giang wants to be friends',
      body: 'giang.vo',
    });
  });

  it('owner_transferred (SRV-05, spec 06): the item sentence, the server as body', () => {
    const subject = {
      type: 'owner_transferred' as const,
      actor: 'An',
      server: 'Ôn thi Giải tích 2',
    };
    expect(pushText(subject, 'vi')).toEqual({
      title: 'An đã chuyển quyền Owner của Ôn thi Giải tích 2 cho bạn',
      body: 'Ôn thi Giải tích 2',
    });
  });
});

describe('messageBody', () => {
  it('shows mentions by name, never as tokens (NFR-I18N-04: names stay as they are)', () => {
    expect(
      messageBody('<@1> <@&5> xem <#9> nhé @everyone', 0, names, 'vi'),
    ).toBe('@An @Nhóm trưởng xem #hoi-dap nhé @everyone');
  });

  it('says an image was sent when there is no text', () => {
    expect(messageBody('', 2, names, 'vi')).toBe('Đã gửi ảnh');
    expect(messageBody('  ', 1, names, 'en')).toBe('Sent an image');
    expect(messageBody('xem ảnh', 1, names, 'vi')).toBe('xem ảnh');
  });

  it('cuts a long message so the push stays under 4KB', () => {
    const body = messageBody('ệ'.repeat(2000), 0, names, 'vi');
    expect([...body]).toHaveLength(BODY_MAX);
    expect(body.endsWith('…')).toBe(true);
  });

  it('does not split an emoji when cutting', () => {
    const body = messageBody('😀'.repeat(BODY_MAX + 5), 0, names, 'vi');
    expect(body).toBe('😀'.repeat(BODY_MAX - 1) + '…');
  });
});
