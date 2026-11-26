import { ErrorCode } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import { asApiError } from '../auth/authFlow';
import type { AttachmentRepository } from './AttachmentRepository';
import type { PickedImage } from './tray';

// C-29 tile states. `waiting`: offline, goes again by itself when the network is back
// (S-HOME-05 offline, CR-28 #29).
export type UploadStatus =
  'uploading' | 'checking' | 'done' | 'failed' | 'waiting' | 'rejected';

export type Upload = {
  key: string; // local, stable across restarts (kept in the outbox entry)
  channelId: string;
  file: PickedImage;
  status: UploadStatus;
  progress: number; // 0…1 of the PUT
  attachmentId: string | null; // once complete
};

// `rejected`: 40014 / 40013 at complete (C-29); `network`: try again later; `refused`: any
// other answer (lost ATTACH_FILES, channel gone…), not worth retrying.
export type UploadResult =
  | { ok: true; id: string }
  | { ok: false; kind: 'rejected' | 'network' | 'refused' };

// What an outbox entry keeps of each image.
export type UploadRef = {
  key: string;
  file: PickedImage;
  attachmentId: string | null;
};

export type UploadsDeps = {
  repo: AttachmentRepository;
  online: () => boolean;
  newKey: () => string;
  release?: (file: PickedImage) => void; // the app's copy of the photo, once not needed
};

const REJECTED: number[] = [
  ErrorCode.UnsupportedFileType,
  ErrorCode.FileTooLarge,
];

// Worth trying again for up to 24 h (8.4.5): no answer (fetch's TypeError, a timeout) or a 5xx
// from the API or storage. A 4xx (an expired or refused upload URL) or a fault on the phone
// (photo file gone, an answer that does not parse) would fail the same way every time.
const isTransient = (err: unknown) => {
  const api = asApiError(err);
  if (api) return api.code >= ErrorCode.InternalError;
  return (
    err instanceof TypeError ||
    (err as { name?: string } | null)?.name === 'AbortError'
  );
};

// REQ-MSG-04 / SRS 5.3 Upload, one image at a time each: POST /attachments → PUT → complete.
// Tiles in the tray and images of pending messages read `state`; the outbox waits on `ensure`.
export function createUploads(deps: UploadsDeps) {
  const state = createStore<{ items: Record<string, Upload> }>(() => ({
    items: {},
  }));
  const runs = new Map<
    string,
    { abort: AbortController; done: Promise<UploadResult> }
  >();

  const patch = (key: string, p: Partial<Upload>) =>
    state.setState((s) => {
      const item = s.items[key];
      return item ? { items: { ...s.items, [key]: { ...item, ...p } } } : s;
    });

  const attempt = async (
    key: string,
    abort: AbortController,
  ): Promise<UploadResult> => {
    const item = state.getState().items[key];
    if (!item) return { ok: false, kind: 'refused' };
    try {
      const { attachment_id, upload_url } = await deps.repo.create({
        purpose: 'message',
        channel_id: item.channelId,
        filename: item.file.name.slice(-255),
        content_type: item.file.type,
        size_bytes: item.file.size,
      });
      await deps.repo.uploadFile(upload_url, item.file, {
        signal: abort.signal,
        onProgress: (progress) => patch(key, { progress }),
      });
      patch(key, { status: 'checking', progress: 1 });
      await deps.repo.complete(attachment_id);
      patch(key, { status: 'done', attachmentId: attachment_id });
      return { ok: true, id: attachment_id };
    } catch (err) {
      const api = asApiError(err);
      if (api && REJECTED.includes(api.code)) {
        patch(key, { status: 'rejected' });
        return { ok: false, kind: 'rejected' };
      }
      patch(key, { status: !api && !deps.online() ? 'waiting' : 'failed' });
      return { ok: false, kind: isTransient(err) ? 'network' : 'refused' };
    }
  };

  const run = (key: string) => {
    runs.get(key)?.abort.abort();
    const abort = new AbortController();
    patch(key, { status: 'uploading', progress: 0, attachmentId: null });
    const done = attempt(key, abort);
    runs.set(key, { abort, done });
    void done.finally(() => {
      if (runs.get(key)?.done === done) runs.delete(key);
    });
    return done;
  };

  const put = (key: string, channelId: string, file: PickedImage) =>
    state.setState((s) => ({
      items: {
        ...s.items,
        [key]: {
          key,
          channelId,
          file,
          status: 'uploading',
          progress: 0,
          attachmentId: null,
        },
      },
    }));

  return {
    state,

    // Uploads as soon as picked (S-HOME-05 `uploading`).
    add(channelId: string, file: PickedImage) {
      const key = deps.newKey();
      put(key, channelId, file);
      void run(key);
      return key;
    },

    // Tapping a `failed` tile (MSG-04 AC4).
    retry(key: string) {
      const item = state.getState().items[key];
      if (item?.status === 'failed' || item?.status === 'waiting')
        void run(key);
    },

    // CR-28 #29: offline tiles need no tap, they go again when the network is back.
    resume() {
      for (const item of Object.values(state.getState().items))
        if (item.status === 'waiting') void run(item.key);
    },

    // `x` on a tile: cancels the upload, the tile goes.
    remove(key: string) {
      runs.get(key)?.abort.abort();
      runs.delete(key);
      const item = state.getState().items[key];
      if (item) deps.release?.(item.file);
      state.setState((s) => {
        const { [key]: _, ...items } = s.items;
        return { items };
      });
    },

    // The backend no longer takes these ids (40001, e.g. swept after 24h): the next try
    // uploads the photos again.
    stale(keys: readonly string[]) {
      for (const key of keys)
        patch(key, { status: 'failed', attachmentId: null, progress: 0 });
    },

    // Sent or dropped with its message: the app's copy of the photo is not needed any more.
    forget(keys: readonly string[]) {
      for (const key of keys) {
        const item = state.getState().items[key];
        if (item) deps.release?.(item.file);
      }
      state.setState((s) => ({
        items: Object.fromEntries(
          Object.entries(s.items).filter(([k]) => !keys.includes(k)),
        ),
      }));
    },

    // The outbox before sending: the attachment id, uploading again what a restart lost.
    async ensure(channelId: string, ref: UploadRef): Promise<UploadResult> {
      if (ref.attachmentId) return { ok: true, id: ref.attachmentId };
      const item = state.getState().items[ref.key];
      if (!item) {
        put(ref.key, channelId, ref.file);
        return run(ref.key);
      }
      if (item.status === 'done' && item.attachmentId)
        return { ok: true, id: item.attachmentId };
      if (item.status === 'rejected') return { ok: false, kind: 'rejected' };
      const running = runs.get(ref.key);
      if (running) return running.done;
      return run(ref.key);
    },
  };
}

export type Uploads = ReturnType<typeof createUploads>;
