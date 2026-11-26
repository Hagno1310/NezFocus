import { describe, expect, it } from 'vitest';
import {
  CreateAttachmentRequest,
  MESSAGE_ATTACHMENT_MAX_BYTES,
} from './attachment.contract.js';

describe('CreateAttachmentRequest (SRS 5.3 Upload)', () => {
  const image = {
    filename: 'loi-giai-1.jpg',
    content_type: 'image/jpeg',
    size_bytes: 1_200_000,
  };

  it('a message image names its channel (REQ-MSG-04)', () => {
    expect(
      CreateAttachmentRequest.safeParse({
        ...image,
        purpose: 'message',
        channel_id: '1200000000000000001',
      }).success,
    ).toBe(true);
    expect(
      CreateAttachmentRequest.safeParse({ ...image, purpose: 'message' })
        .success,
    ).toBe(false);
  });

  it('an avatar has no channel', () => {
    expect(
      CreateAttachmentRequest.safeParse({ ...image, purpose: 'avatar' })
        .success,
    ).toBe(true);
  });

  it('25MB is the message limit (CR-28)', () => {
    expect(MESSAGE_ATTACHMENT_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
});
