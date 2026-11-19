import { createPendingInvites } from '../../domain/invites/pendingInvite';
import { pickRepository } from '../fake';
import { fakeInviteRepository } from './FakeInviteRepository';
import { asyncPendingInviteStorage } from './pendingInviteStorage';
import { remoteInviteRepository } from './RemoteInviteRepository';

export const inviteRepository = pickRepository('invites', {
  remote: remoteInviteRepository,
  fake: fakeInviteRepository,
});

export const pendingInvites = createPendingInvites(asyncPendingInviteStorage);
