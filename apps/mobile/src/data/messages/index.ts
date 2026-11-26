import { randomUUID } from 'expo-crypto';
import { createMessageStore } from '../../domain/messages/messageStore';
import { uploads } from '../attachments/uploads';
import { localDb } from '../db';
import { pickRepository } from '../fake';
import { fakeMessageRepository } from './FakeMessageRepository';
import { createLocalMessages } from './localMessages';
import { remoteMessageRepository } from './RemoteMessageRepository';

export const messageRepository = pickRepository('messages', {
  remote: remoteMessageRepository,
  fake: fakeMessageRepository,
});

// One store for the whole app: the cache and outbox on the local DB (SRS 8.7), the network
// behind messageRepository. Fake or not, messages still go through the real outbox.
export const localMessages = createLocalMessages(localDb);

export const messageStore = createMessageStore({
  local: localMessages,
  remote: messageRepository,
  now: Date.now,
  newNonce: randomUUID,
  uploads,
  setTimer: (fn, ms) => {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  },
});
