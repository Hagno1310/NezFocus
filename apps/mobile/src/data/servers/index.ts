import { pickRepository } from '../fake';
import { fakeServerRepository } from './FakeServerRepository';
import { remoteServerRepository } from './RemoteServerRepository';

export const serverRepository = pickRepository('servers', {
  remote: remoteServerRepository,
  fake: fakeServerRepository,
});
