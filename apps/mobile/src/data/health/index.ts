import { pickRepository } from '../fake';
import { fakeHealthRepository } from './FakeHealthRepository';
import { remoteHealthRepository } from './RemoteHealthRepository';

export const healthRepository = pickRepository('health', {
  remote: remoteHealthRepository,
  fake: fakeHealthRepository,
});
