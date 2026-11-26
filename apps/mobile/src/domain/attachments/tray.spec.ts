import { describe, expect, it } from 'vitest';
import {
  admit,
  fileSize,
  traySendable,
  trayLine,
  type PickedImage,
} from './tray';
import type { Upload } from './uploads';

const MB = 1024 * 1024;
const image = (name: string, size = 2 * MB): PickedImage => ({
  uri: `file:///${name}`,
  name,
  size,
  type: 'image/jpeg',
  width: 1200,
  height: 900,
});
const upload = (status: Upload['status'], name = 'a.jpg'): Upload => ({
  key: name,
  channelId: '7',
  file: image(name),
  status,
  progress: status === 'done' ? 1 : 0.5,
  attachmentId: status === 'done' ? '9' : null,
});

describe('admit (S-HOME-05 too-large / too-many, MSG-04 AC1)', () => {
  it('AC1: 25.1MB never enters the tray; its name is for the Toast', () => {
    const big = image('bao-cao.jpg', Math.round(25.1 * MB));
    expect(admit(0, [image('a.jpg'), big])).toEqual({
      accepted: [image('a.jpg')],
      tooLarge: [big],
      tooMany: false,
    });
    expect(admit(0, [image('max.jpg', 25 * MB)]).accepted).toHaveLength(1);
  });

  it('more than 10 with what is already in the tray: the first ones that fit, and tooMany', () => {
    const picked = Array.from({ length: 8 }, (_, i) => image(`${i}.jpg`));
    const r = admit(4, picked);
    expect(r.accepted.map((p) => p.name)).toEqual([
      '0.jpg',
      '1.jpg',
      '2.jpg',
      '3.jpg',
      '4.jpg',
      '5.jpg',
    ]);
    expect(r.tooMany).toBe(true);
    expect(admit(10, [image('x.jpg')])).toMatchObject({
      accepted: [],
      tooMany: true,
    });
  });
});

describe('trayLine (C-11 › Dòng dưới khay)', () => {
  it('"Đang tải lên 1/3": done out of all while any is still going', () => {
    expect(
      trayLine(
        [
          upload('done', 'a'),
          upload('uploading', 'b'),
          upload('checking', 'c'),
        ],
        false,
      ),
    ).toEqual({ kind: 'progress', done: 1, total: 3 });
    expect(trayLine([upload('done')], false)).toBeNull();
    expect(trayLine([], false)).toBeNull();
  });

  it('a blocked image names itself; a failed upload says to tap; offline waits', () => {
    expect(
      trayLine(
        [upload('failed', 'x'), upload('rejected', 'cong-thuc.png')],
        false,
      ),
    ).toEqual({ kind: 'rejected', name: 'cong-thuc.png' });
    expect(trayLine([upload('failed'), upload('uploading')], false)).toEqual({
      kind: 'failed',
    });
    expect(trayLine([upload('waiting'), upload('done')], false)).toEqual({
      kind: 'offline',
    });
  });

  it('➤ pressed with a blocked or failed one: "Gỡ hoặc thử lại tệp lỗi để gửi" instead', () => {
    expect(trayLine([upload('rejected')], true)).toEqual({ kind: 'fix' });
    expect(trayLine([upload('failed')], true)).toEqual({ kind: 'fix' });
    expect(trayLine([upload('waiting')], true)).toEqual({ kind: 'offline' });
  });
});

describe('traySendable (S-HOME-05 uploading: ➤ works while uploading)', () => {
  it('sends while uploading, checking or waiting for the network; not with a failed / blocked one', () => {
    expect(
      traySendable([
        upload('uploading'),
        upload('checking'),
        upload('waiting'),
      ]),
    ).toBe(true);
    expect(traySendable([upload('done'), upload('failed')])).toBe(false);
    expect(traySendable([upload('rejected')])).toBe(false);
  });
});

describe('fileSize (C-29: one decimal, comma)', () => {
  it('reads like the frames', () => {
    expect(fileSize(1.2 * MB)).toBe('1,2 MB');
    expect(fileSize(3.25 * MB)).toBe('3,3 MB');
    expect(fileSize(820 * 1024)).toBe('820 KB');
    expect(fileSize(300)).toBe('1 KB');
  });
});
