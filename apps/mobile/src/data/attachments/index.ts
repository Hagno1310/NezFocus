import { pickRepository } from '../fake';
import { fakeAttachmentRepository } from './FakeAttachmentRepository';
import { remoteAttachmentRepository } from './RemoteAttachmentRepository';

export const attachmentRepository = pickRepository('attachments', {
  remote: remoteAttachmentRepository,
  fake: fakeAttachmentRepository,
});
