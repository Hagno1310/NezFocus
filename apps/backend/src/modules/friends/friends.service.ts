import { Injectable } from '@nestjs/common';
import {
  CreateRelationshipRequest,
  ErrorCode,
  FRIEND_REQUESTS_PER_DAY,
  LOOKUPS_PER_MINUTE,
  type Relationship,
  type RelationshipType,
  type UpdateRelationshipRequest,
  type UserLookupResponse,
} from '@nezfocus/shared';
import { AppError, rateLimited } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { KeyValueStore } from '../../redis/key-value-store.js';
import { avatarUrls } from '../attachments/media.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PresenceSink } from '../gateway/presence.service.js';
import { NotificationService } from '../notifications/notification-service.js';
import { FriendsRepository, type FriendUser } from './friends.repository.js';
import { FriendshipStatus, type FriendshipRow } from './friends.schema.js';

const DAY_SECONDS = 86_400;

const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown user');
// FRIEND-01 AC4 / AC9: one message whoever blocked whom.
const cannotRequest = () =>
  new AppError(
    ErrorCode.CannotMessageUser,
    'Không thể gửi lời mời cho người dùng này',
  );

const toUser = (u: FriendUser) => ({
  id: u.id.toString(),
  username: u.username,
  display_name: u.displayName,
  avatar: avatarUrls(u.avatarKey),
});

// The pair row seen from `me`.
const typeOf = (me: bigint, pair: FriendshipRow): RelationshipType =>
  pair.status === FriendshipStatus.accepted
    ? 'friend'
    : pair.requestedBy === me
      ? 'outgoing'
      : 'incoming';

const fromPair = (
  me: bigint,
  pair: FriendshipRow,
  other: FriendUser,
): Relationship => ({
  user: toUser(other),
  type: typeOf(me, pair),
  request_message:
    pair.status === FriendshipStatus.pending ? pair.requestMessage : null,
  created_at: pair.createdAt.toISOString(),
});

// REQ-FRIEND-01..04, SRS 8.4.2.
@Injectable()
export class FriendsService {
  constructor(
    private readonly repo: FriendsRepository,
    private readonly events: EventPublisher,
    private readonly notifications: NotificationService,
    private readonly presence: PresenceSink,
    private readonly kv: KeyValueStore,
    private readonly clock: Clock,
  ) {}

  // REQ-FRIEND-04 and READY.relationships.
  async list(me: bigint): Promise<Relationship[]> {
    const [pairs, blocks] = await Promise.all([
      this.repo.friendships(me),
      this.repo.blocks(me),
    ]);
    return [
      ...pairs.map(({ pair, user }) => fromPair(me, pair, user)),
      ...blocks.map(({ at, user }) => ({
        user: toUser(user),
        type: 'blocked' as const,
        request_message: null,
        created_at: at.toISOString(),
      })),
    ];
  }

  // FRIEND-01 v1.9 step 1. Every lookup counts, found or not (AC7).
  async lookup(me: bigint, username: string): Promise<UserLookupResponse> {
    const { count, resetIn } = await this.kv.increment(
      `friend-lookups:${me}`,
      60,
    );
    if (count > LOOKUPS_PER_MINUTE) throw rateLimited(resetIn);
    const user = await this.repo.userByUsername(username);
    if (!user) throw notFound();
    const [relationship, mutual] = await Promise.all([
      this.relationshipTo(me, user.id),
      this.repo.mutualServers(me, user.id),
    ]);
    return {
      user: { ...toUser(user), bio: user.bio },
      relationship,
      mutual_servers: mutual.map((s) => ({
        id: s.id.toString(),
        name: s.name,
      })),
    };
  }

  async send(
    me: bigint,
    input: CreateRelationshipRequest,
  ): Promise<Relationship> {
    const body = CreateRelationshipRequest.parse(input);
    const other = body.username
      ? await this.repo.userByUsername(body.username)
      : await this.repo.user(BigInt(body.user_id!));
    if (!other) throw notFound();
    if (other.id === me)
      throw new AppError(ErrorCode.ValidationError, 'Cannot befriend yourself');
    if (await this.blockedEitherWay(me, other.id)) throw cannotRequest();

    const pair = await this.repo.pair(me, other.id);
    if (pair?.status === FriendshipStatus.accepted)
      throw new AppError(ErrorCode.AlreadyFriends, 'Already friends');
    if (pair?.requestedBy === me)
      throw new AppError(
        ErrorCode.FriendRequestAlreadyPending,
        'Request already sent',
      );
    // AC5: they invited me first, so this is an accept (not counted in the daily limit).
    if (pair) return this.acceptFrom(other.id, me);

    const limitKey = `friend-requests:${me}`;
    const sent = await this.kv.peek(limitKey);
    if (sent.count >= FRIEND_REQUESTS_PER_DAY) throw rateLimited(sent.resetIn);
    const at = this.clock.now();
    const inserted = await this.repo.insertRequest({
      from: me,
      to: other.id,
      message: 'message' in body ? body.message : null,
      at,
    });
    // A request of theirs (or mine, from another device) landed meanwhile: answer as if it had been there.
    if (!inserted) return this.send(me, input);
    await this.kv.increment(limitKey, DAY_SECONDS);

    const row = (await this.repo.pair(me, other.id))!;
    const self = (await this.repo.user(me))!;
    await this.events.toUser(
      other.id,
      'RELATIONSHIP_ADD',
      fromPair(other.id, row, self),
    );
    await this.notifications.create(other.id, 'friend_request', {
      actor_id: me.toString(),
    });
    const mine = fromPair(me, row, other);
    await this.events.toUser(me, 'RELATIONSHIP_ADD', mine);
    return mine;
  }

  async update(
    me: bigint,
    otherId: bigint,
    body: UpdateRelationshipRequest,
  ): Promise<Relationship> {
    return body.type === 'friend'
      ? this.acceptFrom(otherId, me)
      : this.block(me, otherId);
  }

  // DELETE: decline, cancel, unfriend or unblock, by what the relationship is now.
  async remove(me: bigint, otherId: bigint) {
    if (await this.repo.unblock(me, otherId)) {
      await this.removed(me, otherId, 'blocked');
      return this.presence.relationshipChanged(me, otherId);
    }
    const pair = await this.repo.deletePair(me, otherId);
    if (!pair) throw notFound();
    const mine = typeOf(me, pair);
    if (mine === 'friend') {
      await this.removed(me, otherId, 'friend');
      await this.removed(otherId, me, 'friend');
      return this.presence.relationshipChanged(me, otherId);
    }
    const from = pair.requestedBy;
    const to = from === me ? otherId : me;
    await this.notifications.deleteBySource({
      friend_request: { from_user_id: from, to_user_id: to },
    });
    await this.removed(me, otherId, mine);
    // FRIEND-02 AC3: a decline tells the sender nothing; a cancel clears the receiver's list.
    if (mine === 'outgoing') await this.removed(otherId, me, 'incoming');
  }

  private async acceptFrom(requester: bigint, accepter: bigint) {
    const [a, b] = await Promise.all([
      this.repo.user(requester),
      this.repo.user(accepter),
    ]);
    if (!a || !b) throw notFound();
    // Ticket #111: accepting a request cancelled meanwhile is 40401.
    const row = await this.repo.accept(requester, accepter, this.clock.now());
    if (!row) throw notFound();
    await this.events.toUser(
      requester,
      'RELATIONSHIP_ADD',
      fromPair(requester, row, b),
    );
    await this.events.toUser(
      accepter,
      'RELATIONSHIP_ADD',
      fromPair(accepter, row, a),
    );
    // FRIEND-02 AC2, 8.4.2: the one who asked first gets the item.
    await this.notifications.create(requester, 'friend_accepted', {
      actor_id: accepter.toString(),
    });
    await this.presence.relationshipChanged(requester, accepter);
    return fromPair(accepter, row, a);
  }

  private async block(me: bigint, otherId: bigint): Promise<Relationship> {
    if (otherId === me)
      throw new AppError(ErrorCode.ValidationError, 'Cannot block yourself');
    const other = await this.repo.user(otherId);
    if (!other) throw notFound();
    const at = this.clock.now();
    const { gone } = await this.repo.block(me, otherId, at);
    if (gone) {
      if (gone.status === FriendshipStatus.pending)
        await this.notifications.deleteBySource({
          friend_request: {
            from_user_id: gone.requestedBy,
            to_user_id: gone.requestedBy === me ? otherId : me,
          },
        });
      // The blocked one sees the relationship go, as after an unfriend (FRIEND-03: never told).
      await this.removed(otherId, me, typeOf(otherId, gone));
    }
    const blocked: Relationship = {
      user: toUser(other),
      type: 'blocked',
      request_message: null,
      created_at: at.toISOString(),
    };
    // Replaces whatever the list had for this user (the app keys relationships by user id).
    await this.events.toUser(me, 'RELATIONSHIP_ADD', blocked);
    await this.presence.relationshipChanged(me, otherId);
    return blocked;
  }

  private removed(to: bigint, userId: bigint, type: RelationshipType) {
    return this.events.toUser(to, 'RELATIONSHIP_REMOVE', {
      user_id: userId.toString(),
      type,
    });
  }

  private async blockedEitherWay(a: bigint, b: bigint) {
    return (
      (await this.repo.isBlocked(a, b)) || (await this.repo.isBlocked(b, a))
    );
  }

  // FRIEND-01 AC9: "they blocked me" reads as none.
  private async relationshipTo(me: bigint, otherId: bigint) {
    if (await this.repo.isBlocked(me, otherId)) return 'blocked' as const;
    const pair = await this.repo.pair(me, otherId);
    return pair ? typeOf(me, pair) : ('none' as const);
  }
}
