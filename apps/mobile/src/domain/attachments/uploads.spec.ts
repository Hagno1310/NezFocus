import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { AttachmentRepository } from './AttachmentRepository';
import type { PickedImage } from './tray';
import { createUploads } from './uploads';

const photo: PickedImage = {
  uri: 'file:///loi-giai-1.jpg',
  name: 'loi-giai-1.jpg',
  size: 1_200_000,
  type: 'image/jpeg',
  width: 1200,
  height: 900,
};
const apiError = (code: number) => Object.assign(new Error('x'), { code });
const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

// A storage we answer by hand: each PUT waits for `finish` (or `fail`).
function fakeRepo() {
  const calls: string[] = [];
  const puts: {
    progress: (p: number) => void;
    finish: () => void;
    fail: (e: unknown) => void;
    signal?: AbortSignal;
  }[] = [];
  let completeError: unknown = null;
  let nextId = 100;
  const repo: AttachmentRepository = {
    create: async (body) => {
      calls.push(
        `create ${body.purpose} ${body.channel_id} ${body.filename} ${body.content_type} ${body.size_bytes}`,
      );
      nextId += 1;
      return {
        attachment_id: String(nextId),
        upload_url: `http://s3/${nextId}`,
        expires_at: '2026-11-26T13:00:00.000Z',
      };
    },
    uploadFile: (url, _file, opts) =>
      new Promise((resolve, reject) => {
        calls.push(`put ${url}`);
        puts.push({
          progress: (p) => opts?.onProgress?.(p),
          finish: () => resolve(),
          fail: reject,
          signal: opts?.signal,
        });
      }),
    complete: async (id) => {
      calls.push(`complete ${id}`);
      if (completeError) throw completeError;
      return {
        id,
        purpose: 'message',
        content_type: 'image/jpeg',
        width: 1200,
        height: 900,
      };
    },
  };
  return {
    repo,
    calls,
    puts,
    refuseNext: (e: unknown) => (completeError = e),
  };
}

function setup() {
  const storage = fakeRepo();
  let online = true;
  let keys = 0;
  const uploads = createUploads({
    repo: storage.repo,
    online: () => online,
    newKey: () => `k${++keys}`,
  });
  const item = (key: string) => uploads.state.getState().items[key];
  return {
    uploads,
    storage,
    item,
    goOffline: (v = true) => (online = !v),
  };
}

describe('uploads (S-HOME-05, SRS 5.3 Upload)', () => {
  it('uploads as soon as picked: progress, then "Đang kiểm tra", then done with the id', async () => {
    const { uploads, storage, item } = setup();
    const key = uploads.add('7', photo);
    await settle();
    expect(storage.calls).toEqual([
      'create message 7 loi-giai-1.jpg image/jpeg 1200000',
      'put http://s3/101',
    ]);
    storage.puts[0]!.progress(0.62);
    expect(item(key)).toMatchObject({ status: 'uploading', progress: 0.62 });
    storage.puts[0]!.finish();
    await settle();
    expect(storage.calls.at(-1)).toBe('complete 101');
    expect(item(key)).toMatchObject({ status: 'done', attachmentId: '101' });
  });

  it('40014 at complete → blocked, only removable (C-29 `rejected`)', async () => {
    const { uploads, storage, item } = setup();
    storage.refuseNext(apiError(ErrorCode.UnsupportedFileType));
    const key = uploads.add('7', photo);
    await settle();
    storage.puts[0]!.finish();
    await settle();
    expect(item(key)?.status).toBe('rejected');
  });

  it('AC4: the network drops mid-upload → failed; tapping retries the whole upload', async () => {
    const { uploads, storage, item } = setup();
    const key = uploads.add('7', photo);
    await settle();
    storage.puts[0]!.fail(new TypeError('Network request failed'));
    await settle();
    expect(item(key)?.status).toBe('failed');
    uploads.retry(key);
    await settle();
    storage.puts[1]!.finish();
    await settle();
    expect(item(key)).toMatchObject({ status: 'done', attachmentId: '102' });
  });

  it('offline: waits ("Sẽ tải lên khi có mạng") and goes again by itself when back (CR-28 #29)', async () => {
    const { uploads, storage, item, goOffline } = setup();
    const key = uploads.add('7', photo);
    await settle();
    goOffline();
    storage.puts[0]!.fail(new TypeError('Network request failed'));
    await settle();
    expect(item(key)?.status).toBe('waiting');
    goOffline(false);
    uploads.resume();
    await settle();
    storage.puts[1]!.finish();
    await settle();
    expect(item(key)?.status).toBe('done');
  });

  it('`x` while uploading cancels it and drops the tile', async () => {
    const { uploads, storage, item } = setup();
    const key = uploads.add('7', photo);
    await settle();
    uploads.remove(key);
    expect(storage.puts[0]!.signal?.aborted).toBe(true);
    expect(item(key)).toBeUndefined();
  });

  it('ensure: a done one at once; a lost one (app restarted) uploads again; a blocked one says so', async () => {
    const { uploads, storage } = setup();
    await expect(
      uploads.ensure('7', { key: 'old', file: photo, attachmentId: '55' }),
    ).resolves.toEqual({ ok: true, id: '55' });

    const again = uploads.ensure('7', {
      key: 'lost',
      file: photo,
      attachmentId: null,
    });
    await settle();
    storage.puts[0]!.finish();
    await expect(again).resolves.toEqual({ ok: true, id: '101' });

    storage.refuseNext(apiError(ErrorCode.UnsupportedFileType));
    const blocked = uploads.ensure('7', {
      key: 'bad',
      file: photo,
      attachmentId: null,
    });
    await settle();
    storage.puts[1]!.finish();
    await expect(blocked).resolves.toEqual({ ok: false, kind: 'rejected' });
  });

  it('ensure on a failed one retries it; a network drop answers `network` for the outbox backoff', async () => {
    const { uploads, storage } = setup();
    const key = uploads.add('7', photo);
    await settle();
    storage.puts[0]!.fail(new TypeError('Network request failed'));
    await settle();
    const first = uploads.ensure('7', {
      key,
      file: photo,
      attachmentId: null,
    });
    await settle();
    storage.puts[1]!.fail(new TypeError('Network request failed'));
    await expect(first).resolves.toEqual({ ok: false, kind: 'network' });
  });
});
