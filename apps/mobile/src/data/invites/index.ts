import { pickRepository } from '../fake';
import { fakeInviteRepository } from './FakeInviteRepository';
import { remoteInviteRepository } from './RemoteInviteRepository';

export const inviteRepository = pickRepository('invites', {
  remote: remoteInviteRepository,
  fake: fakeInviteRepository,
});
