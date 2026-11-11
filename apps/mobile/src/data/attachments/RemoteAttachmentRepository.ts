import {
  AttachmentResponse,
  AttachmentRoutes,
  AttachmentUploadResponse,
  ErrorCode,
} from '@nezfocus/shared';
import type { AttachmentRepository } from '../../domain/attachments/AttachmentRepository';
import { ApiError, api } from '../api';

export const remoteAttachmentRepository: AttachmentRepository = {
  create: async (body) =>
    AttachmentUploadResponse.parse(
      await api.request(AttachmentRoutes.create, { method: 'POST', body }),
    ),
  // Straight to object storage (not the API): same Content-Type as declared, no bearer.
  uploadFile: async (url, file) => {
    const bytes = await (await fetch(file.uri)).blob();
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: bytes,
    });
    if (!res.ok)
      throw new ApiError(res.status, {
        code: ErrorCode.InternalError,
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
