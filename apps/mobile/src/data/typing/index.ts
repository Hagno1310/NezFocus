import { pickRepository } from '../fake';
import { fakeTypingRepository } from './FakeTypingRepository';
import { remoteTypingRepository } from './RemoteTypingRepository';

export const typingRepository = pickRepository('typing', {
  remote: remoteTypingRepository,
  fake: fakeTypingRepository,
});
