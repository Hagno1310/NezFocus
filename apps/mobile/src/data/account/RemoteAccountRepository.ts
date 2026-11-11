import {
  AccountRoutes,
  AttachmentResponse,
  AttachmentRoutes,
  AttachmentUploadResponse,
  CurrentUser,
  ErrorCode,
  SessionInfo,
} from '@nezfocus/shared';
import type { AccountRepository } from '../../domain/account/AccountRepository';
import { ApiError, api } from '../api';

export const remoteAccountRepository: AccountRepository = {
  me: async () => CurrentUser.parse(await api.request(AccountRoutes.me)),
  changePassword: async (body) => {
    await api.request(AccountRoutes.changePassword, { method: 'POST', body });
  },
  sessions: async () =>
    SessionInfo.array().parse(await api.request(AccountRoutes.sessions)),
  revokeSession: async (id) => {
    await api.request(AccountRoutes.session.replace(':id', id), {
      method: 'DELETE',
    });
  },
  revokeOtherSessions: async () => {
    await api.request(AccountRoutes.sessions, { method: 'DELETE' });
  },
  updateProfile: async (body) =>
    CurrentUser.parse(
      await api.request(AccountRoutes.me, { method: 'PATCH', body }),
    ),
  createAttachment: async (body) =>
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
  completeAttachment: async (id) =>
    AttachmentResponse.parse(
      await api.request(AttachmentRoutes.complete.replace(':id', id), {
        method: 'POST',
      }),
    ),
};
