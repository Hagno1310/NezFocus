import { createFriendActions } from '../../domain/friends/actions';
import { friendsStore } from '../../domain/friends/friends';
import { localDb } from '../db';
import { pickRepository } from '../fake';
import { fakeFriendRepository } from './FakeFriendRepository';
import { createLocalRelationships } from './localRelationships';
import { remoteFriendRepository } from './RemoteFriendRepository';

export const friendRepository = pickRepository('friends', {
  remote: remoteFriendRepository,
  fake: fakeFriendRepository,
});

export const localRelationships = createLocalRelationships(localDb);

export const friendActions = createFriendActions(
  friendRepository,
  friendsStore,
);
