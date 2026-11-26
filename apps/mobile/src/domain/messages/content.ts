import type { MessageResponse } from '@nezfocus/shared';

// REQ-MSG-04: a message of images and no text reads "Đã gửi một ảnh" where only text fits
// (S-DM-01 line 2, S-HOME-03 pinned rows).
export const imagesOnly = (
  m: Pick<MessageResponse, 'content' | 'attachments'>,
) => !m.content.trim() && m.attachments.length > 0;
