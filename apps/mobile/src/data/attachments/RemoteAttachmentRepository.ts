import {
  AttachmentResponse,
  AttachmentRoutes,
  AttachmentUploadResponse,
  ErrorCode,
} from '@nezfocus/shared';
import { File, UploadType } from 'expo-file-system';
import type { AttachmentRepository } from '../../domain/attachments/AttachmentRepository';
import { ApiError, api } from '../api';

export const remoteAttachmentRepository: AttachmentRepository = {
  create: async (body) =>
    AttachmentUploadResponse.parse(
      await api.request(AttachmentRoutes.create, { method: 'POST', body }),
    ),
  // Straight to object storage (not the API): same Content-Type as declared, no bearer. The
  // native task streams the file and reports progress (S-HOME-05 `uploading`).
  uploadFile: async (url, file, opts) => {
    const local = new File(file.uri);
    if (!local.exists) throw new Error('upload: the photo file is gone');
    let res;
    try {
      res = await local.upload(url, {
        httpMethod: 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
        headers: { 'Content-Type': file.type },
        onProgress: ({ bytesSent, totalBytes }) =>
          opts?.onProgress?.(totalBytes > 0 ? bytesSent / totalBytes : 0),
        signal: opts?.signal,
      });
    } catch (err) {
      if (opts?.signal?.aborted) throw err;
      // The native task rejects a dropped connection with UnableToUploadException; the file
      // is known to exist, so read it as fetch's network failure.
      throw new TypeError(`upload: ${(err as Error).message}`);
    }
    // A 4xx is the presigned URL refused (signature, expired): a retry fails the same way.
    if (res.status < 200 || res.status >= 300)
      throw new ApiError(res.status, {
        code: res.status >= 500 ? ErrorCode.InternalError : ErrorCode.Forbidden,
        message: `upload failed (${res.status})`,
      });
  },
  complete: async (id) =>
    AttachmentResponse.parse(
      await api.request(AttachmentRoutes.complete.replace(':id', id), {
        method: 'POST',
      }),
    ),
};
